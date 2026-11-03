# Security Policy

## Supported Versions

| Version | Supported | Description |
| :--- | :--- | :--- |
| `1.0.x` | Yes | Current stable release branch (`main`) |
| `< 1.0.0` | No | Legacy versions |

## Security and Vector Sanitization Scope

wirecanvas is a client-side vector wireframing tool handling user layout files and image exports. Security invariants include:
* **JSON Import Validation**: Layout files imported from untrusted sources must strictly conform to expected numeric coordinate and component type schemas.
* **SVG Output Sanitization**: Vector serialization must prevent DOM-based XSS, XML external entity (XXE) injection, and inline script execution.
* **Client-Side Privacy**: User designs must remain strictly in local browser memory and never be exfiltrated.

## Reporting a Vulnerability

If you discover a vector injection vector, schema deserialization flaw, or client security issue, report it privately:

* **Security Contact**: Gohar Rehman
* **Email**: `goharrehmanfsd260@gmail.com`
* **Response SLA**: Initial acknowledgement within 48 hours; resolution timeline provided within 7 days.

Please do not open public GitHub issues or discussions regarding undisclosed vulnerabilities.