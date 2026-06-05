#!/usr/bin/env python3
"""Price-drop alert checker for sneakers-for-less.

Scans the users table; for each user with email notifications on, evaluates their
saved price alerts against the products table's current lowest price. When an
alert's product has dropped to/below the user's target price, it queues a
price-drop email (SES) and records dedupe markers on the alert so the same drop
isn't emailed twice.

Conventions are reused from price_refresh.py: the env-switched DynamoDB client
(_client), the ISO-8601 UTC stamp (_now_iso), the lowest-price computation
(current_price), the handler(event, context) shape, the __main__ block, and the
"refuse to do the dangerous thing" safety guard.

Schema (confirmed):
  users    (PK email): emailNotifications (BOOL, missing -> true),
           priceAlerts (JSON-string array of
           {id, name, image, currentPrice, targetPrice, createdAt}).
  products (PK id):    current lowest = MIN over the parsed `prices` JSON array.

Modes / safety:
  - EMAIL_DRY_RUN truthy -> never calls SES; logs each email that *would* send,
    but STILL writes the dedupe markers (so dedupe is testable across runs).
  - Real sending happens only when EMAIL_DRY_RUN is falsy.
  - Guard: if NOT dry-run AND DYNAMODB_ENDPOINT is set, raise (never send real
    emails while reading DynamoDB Local).
  - If NOT dry-run AND SES_SENDER is unset, log and send nothing.

Local dry-run (safe; never touches prod or SES):
  DYNAMODB_ENDPOINT=http://localhost:8000 EMAIL_DRY_RUN=true \
    /opt/anaconda3/bin/python3 backend/alert_checker.py
"""
import os
import json
import logging
import urllib.parse

import boto3

# Reuse price_refresh's env-switched client, UTC stamp, and lowest-price logic.
from price_refresh import _client, _now_iso, current_price

USERS_TABLE = "sneakers-for-less-users"
PRODUCTS_TABLE = "sneakers-for-less-products"
REGION = "us-east-2"

SITE_BASE = "https://sneakersforless.org"
UNSUB_URL = f"{SITE_BASE}/?view=account&tab=settings"

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("alert_checker")


def _truthy(v):
    """Env-var truthiness: any non-empty value except the usual 'off' words."""
    return bool(v) and v.strip().lower() not in ("0", "false", "no", "off")


def _money(x):
    return f"{float(x):.2f}"


def _email_notifications_on(user_item):
    """Missing attribute is treated as opted-in (true)."""
    attr = user_item.get("emailNotifications")
    if attr is None:
        return True
    if "BOOL" in attr:
        return bool(attr["BOOL"])
    return True


def _parse_alerts(user_item):
    """Parse the priceAlerts JSON-string array; [] if missing/unparseable."""
    attr = user_item.get("priceAlerts")
    raw = attr.get("S") if attr else None
    if not raw:
        return []
    try:
        alerts = json.loads(raw)
    except (ValueError, TypeError):
        email = user_item.get("email", {}).get("S", "?")
        log.warning("user %s has unparseable priceAlerts; skipping", email)
        return []
    return alerts if isinstance(alerts, list) else []


def _product_lowest(db, product_id):
    """Current lowest price for a product id, or None if missing/unparseable."""
    if not product_id:
        return None
    resp = db.get_item(TableName=PRODUCTS_TABLE, Key={"id": {"S": str(product_id)}})
    item = resp.get("Item")
    if not item:
        log.warning("alert references missing product id=%s; skipping", product_id)
        return None
    low = current_price(item)  # reused from price_refresh
    if low is None:
        log.warning("product id=%s has no parseable prices; skipping", product_id)
        return None
    return float(low)


def _build_email(to_email, alert, lowest):
    """Build a price-drop email payload for SES (plain text + simple HTML)."""
    name = alert.get("name") or alert.get("id") or "your sneaker"
    pid = alert.get("id") or ""
    try:
        target = float(alert.get("targetPrice"))
    except (TypeError, ValueError):
        target = None
    product_url = f"{SITE_BASE}/?product=" + urllib.parse.quote(str(pid))
    low_s, tgt_s = _money(lowest), (_money(target) if target is not None else "—")

    subject = f"Price drop: {name} is now ${low_s}"
    text = (
        "Good news — a pair you're tracking just dropped in price.\n\n"
        f"{name}\n"
        f"New lowest price: ${low_s}\n"
        f"Your target price: ${tgt_s}\n\n"
        f"View deal: {product_url}\n\n"
        "You're receiving this because email notifications are on for your "
        "SneakersForLess account.\n"
        f"Unsubscribe / manage notifications: {UNSUB_URL}\n"
    )
    html = (
        f"<p>Good news — a pair you're tracking just dropped in price.</p>"
        f"<p><strong>{name}</strong><br>"
        f"New lowest price: <strong>${low_s}</strong><br>"
        f"Your target price: ${tgt_s}</p>"
        f'<p><a href="{product_url}">View deal</a></p>'
        f"<p style=\"color:#888;font-size:12px\">You're receiving this because email "
        f"notifications are on for your SneakersForLess account.<br>"
        f'<a href="{UNSUB_URL}">Unsubscribe / manage notifications</a></p>'
    )
    return {"to": to_email, "subject": subject, "text": text, "html": html}


def _send_via_ses(ses, sender, email):
    ses.send_email(
        Source=sender,
        Destination={"ToAddresses": [email["to"]]},
        Message={
            "Subject": {"Data": email["subject"]},
            "Body": {
                "Text": {"Data": email["text"]},
                "Html": {"Data": email["html"]},
            },
        },
    )


# ---- Handler ----------------------------------------------------------------
def handler(event, context):
    """Evaluate every user's price alerts and notify on fresh drops."""
    dry_run = _truthy(os.environ.get("EMAIL_DRY_RUN"))
    local_endpoint = os.environ.get("DYNAMODB_ENDPOINT")
    ses_sender = os.environ.get("SES_SENDER")

    # Safety guard: never send real emails while reading DynamoDB Local.
    if not dry_run and local_endpoint:
        raise RuntimeError(
            "Refusing to run: EMAIL_DRY_RUN is off but DYNAMODB_ENDPOINT is set "
            f"({local_endpoint}). Real emails must not be sent from local data. "
            "Set EMAIL_DRY_RUN=true for local runs, or unset DYNAMODB_ENDPOINT to "
            "target real AWS."
        )

    # Mode: dry-run (log only, still mark) | send (SES) | disabled (misconfigured).
    if dry_run:
        mode = "dry-run"
    elif ses_sender:
        mode = "send"
    else:
        mode = "disabled"
        log.error("EMAIL_DRY_RUN is off and SES_SENDER is unset — no emails will be sent.")

    db = _client()
    endpoint = local_endpoint or f"AWS default ({REGION})"
    log.info("Alert checker starting (endpoint: %s, mode: %s)", endpoint, mode)

    emails = []
    users_scanned = notif_off = alerts_evaluated = triggered = deduped = users_updated = 0

    paginator = db.get_paginator("scan")
    for page in paginator.paginate(TableName=USERS_TABLE):
        for item in page["Items"]:
            users_scanned += 1
            email = item.get("email", {}).get("S")
            if not email:
                continue
            if not _email_notifications_on(item):
                notif_off += 1
                continue

            alerts = _parse_alerts(item)
            if not alerts:
                continue

            changed = False
            for alert in alerts:
                if not isinstance(alert, dict):
                    continue
                alerts_evaluated += 1

                lowest = _product_lowest(db, alert.get("id"))
                if lowest is None:
                    continue
                try:
                    target = float(alert.get("targetPrice"))
                except (TypeError, ValueError):
                    log.warning("alert id=%s for %s has no numeric targetPrice; skipping",
                                alert.get("id"), email)
                    continue

                if lowest > target:
                    continue
                triggered += 1

                # Dedupe: notify on first drop to/below target, and again only on
                # a further drop below the last price we notified at.
                last = alert.get("lastNotifiedPrice")
                last = float(last) if last is not None else None
                if last is not None and lowest >= last:
                    deduped += 1
                    continue

                if mode == "disabled":
                    # Can't send; don't mark, so a configured run can still notify.
                    continue

                emails.append(_build_email(email, alert, lowest))
                alert["lastNotifiedPrice"] = lowest
                alert["notifiedAt"] = _now_iso()
                changed = True

            if changed:
                db.update_item(
                    TableName=USERS_TABLE,
                    Key={"email": {"S": email}},
                    UpdateExpression="SET priceAlerts = :a",
                    ExpressionAttributeValues={":a": {"S": json.dumps(alerts)}},
                )
                users_updated += 1

    # Step 4: send (or, in dry-run, log) the queued emails.
    sent = 0
    if mode == "send":
        ses = boto3.client("ses", region_name=REGION)
    for em in emails:
        if mode == "dry-run":
            log.info("[DRY-RUN] would email %s | %s", em["to"], em["subject"])
        elif mode == "send":
            try:
                _send_via_ses(ses, ses_sender, em)
                sent += 1
                log.info("sent email to %s | %s", em["to"], em["subject"])
            except Exception as e:  # noqa: BLE001
                log.error("failed sending to %s: %s", em["to"], e)

    verb = "would-send" if mode == "dry-run" else "sent"
    log.info(
        "Alert checker done: %d users scanned (%d notif-off), %d alerts evaluated, "
        "%d triggered, %d deduped, %d users updated, %d emails %s",
        users_scanned, notif_off, alerts_evaluated, triggered, deduped,
        users_updated, (len(emails) if mode != "send" else sent), verb,
    )
    return {
        "users_scanned": users_scanned,
        "notif_off": notif_off,
        "alerts_evaluated": alerts_evaluated,
        "triggered": triggered,
        "deduped": deduped,
        "users_updated": users_updated,
        "emails": len(emails) if mode != "send" else sent,
        "mode": mode,
    }


if __name__ == "__main__":
    # A bare local run is a safe dry-run against DynamoDB Local: default the
    # endpoint to local and force dry-run unless the caller overrides them.
    os.environ.setdefault("DYNAMODB_ENDPOINT", "http://localhost:8000")
    os.environ.setdefault("EMAIL_DRY_RUN", "true")
    handler({}, None)
