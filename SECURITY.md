# Security Policy

## Supported versions

Only the latest release is supported. Salesforce Classic is being retired by
Salesforce, so this extension is in maintenance mode: security and
compatibility fixes are accepted, but no new features are planned.

| Version | Supported          |
| ------- | ------------------ |
| 1.5.x   | :white_check_mark: |
| < 1.5   | :x:                |

## Reporting a vulnerability

**Do not open a public issue for a security vulnerability.**

Report it privately using GitHub's
[private vulnerability reporting](https://github.com/selegic/switch-to-classic/security/advisories/new),
or contact the maintainers through the repository's
[GitHub organization page](https://github.com/selegic).

Include as much as you can:

- the extension version and Chrome version,
- the steps to reproduce,
- the impact you observed,
- whether a proof of concept is available.

## What to expect

- Acknowledgement within **5 business days**.
- A fix timeline, or an explanation if the report is not accepted.
- A coordinated disclosure once a fix is released, unless you ask for a
  different timeline. Please allow **90 days** before public disclosure.

## Scope

In scope: the extension code in this repository (popup, content script,
service worker, manifests, and build pipeline).

Out of scope: Salesforce itself, third-party tooling (Angular, Vite),
and social engineering or spam.
