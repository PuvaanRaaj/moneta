# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.x     | Yes       |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security issues by emailing the maintainer directly or using
[GitHub's private vulnerability reporting](https://github.com/PuvaanRaaj/moneta/security/advisories/new).

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

You will receive a response within **72 hours**. If the issue is confirmed, a patch will be
released as soon as possible — typically within 7 days for critical issues.

## Security Design

`moneta` is designed with security in mind:

- **No `eval` or dynamic code execution** — all arithmetic uses native BigInt
- **No external network calls** — zero runtime dependencies
- **No install scripts** — `postinstall` / `preinstall` hooks are absent to prevent
  supply-chain attacks at install time
- **npm provenance** — every published version is cryptographically linked to its
  source commit and CI run (SLSA Level 2). Verify with `npm audit signatures`
- **Input validation** — all public inputs are validated and throw typed errors;
  no silent coercions
- **Immutability** — `Money` instances are immutable; no shared mutable state

## Verifying Package Integrity

```bash
# Verify the published package was built from this repo
npm audit signatures

# Check for known CVEs in your dependency tree
npm audit
```
