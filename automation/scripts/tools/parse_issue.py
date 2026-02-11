#!/usr/bin/env python3
import logging
import re
import json
import sys
from pathlib import Path

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def _extract_content(content: str) -> str:
    """Extract content, handling markdown code blocks."""
    print(f"[_extract_content] Input raw: {repr(content[:200])}", file=sys.stderr)
    content = content.strip()
    
    # If content is wrapped in code block, extract inner content
    if content.startswith("```"):
        print(f"[_extract_content] Code block detected!", file=sys.stderr)
        lines = content.split("\n")
        print(f"[_extract_content] Total lines: {len(lines)}", file=sys.stderr)
        # Remove first line (```text or ```) and last line (```)
        if len(lines) >= 3:
            content = "\n".join(lines[1:-1])
            print(f"[_extract_content] Extracted inner content: {repr(content[:200])}", file=sys.stderr)
        else:
            print(f"[_extract_content] Not enough lines in code block", file=sys.stderr)
    else:
        print(f"[_extract_content] No code block detected", file=sys.stderr)
    
    result = content.strip()
    print(f"[_extract_content] Returning: {repr(result[:200])}", file=sys.stderr)
    return result


def parse_issue_body(body: str):
    """
    Parses the GitHub Issue body into a structured JSON.
    Uses regex to find sections based on markdown headers.
    """
    print(f"[parse_issue_body] Body length: {len(body)}", file=sys.stderr)
    print(f"[parse_issue_body] Body preview: {repr(body[:500])}", file=sys.stderr)
    
    sections = {
        "Device Vendor": "vendor",
        "设备厂商": "vendor",
        "Device Model": "model",
        "设备型号": "model",
        "Uplink Data Examples": "uplinkData",
        "上行数据示例": "uplinkData",
        "BACnet Object Mapping Requirements": "bacnetMapping",
        "BACnet 对象映射要求": "bacnetMapping",
        "LoRaWAN Class": "lorawanClass",
        "LoRaWAN 类别": "lorawanClass",
        "LoRaWAN Protocol Version": "lorawanVersion",
        "LoRaWAN 协议版本": "lorawanVersion",
        "Product Manual/Datasheet Link": "datasheet",
        "产品手册链接": "datasheet",
    }

    data = {}

    # Simple markdown section parser
    # Looks for ### Header and captures everything until the next ### or end of file
    pattern = r"###\s*(.*?)\n(.*?)(?=###|$)"
    matches = re.findall(pattern, body, re.DOTALL)
    print(f"[parse_issue_body] Found {len(matches)} sections", file=sys.stderr)
    
    for i, (header, content) in enumerate(matches):
        header_stripped = header.strip()
        print(f"[parse_issue_body] Section {i+1}: '{header_stripped}' (raw content length: {len(content)})", file=sys.stderr)
        content_clean = _extract_content(content)
        print(f"[parse_issue_body] Section {i+1} cleaned content: {repr(content_clean[:100])}", file=sys.stderr)

        field = sections.get(header_stripped)
        if field:
            data[field] = content_clean
            print(f"[parse_issue_body] Mapped '{header_stripped}' -> '{field}'", file=sys.stderr)
        else:
            print(f"[parse_issue_body] Unmapped section: '{header_stripped}'", file=sys.stderr)

    print(f"[parse_issue_body] Extracted data keys: {list(data.keys())}", file=sys.stderr)
    print(f"[parse_issue_body] uplinkData: {repr(data.get('uplinkData', 'NOT FOUND'))}", file=sys.stderr)

    # Handle multiple devices if vendor/model contains separators
    vendors = [
        v.strip() for v in re.split(r"[,;\n]", data.get("vendor", "")) if v.strip()
    ]
    models = [
        m.strip() for m in re.split(r"[,;\n]", data.get("model", "")) if m.strip()
    ]

    devices = []
    # If counts match, pair them up. Otherwise, repeat vendor for models.
    for i, model in enumerate(models):
        vendor = (
            vendors[i] if i < len(vendors) else (vendors[0] if vendors else "Unknown")
        )
        device = {
            "vendor": vendor,
            "model": model,
            "uplinkData": data.get("uplinkData", ""),
            "bacnetMapping": data.get("bacnetMapping", ""),
            "lorawanClass": data.get("lorawanClass", ""),
            "lorawanVersion": data.get("lorawanVersion", ""),
            "datasheet": data.get("datasheet", ""),
        }
        devices.append(device)
        print(f"[parse_issue_body] Device {i+1}: {vendor}-{model}, uplinkData length: {len(device['uplinkData'])}", file=sys.stderr)

    # Language detection
    zh_count = len(re.findall(r"[\u4e00-\u9fff]", body))
    lang = "zh" if zh_count / (len(body) + 1) > 0.1 else "en"

    result = {"language": lang, "devices": devices}
    print(f"[parse_issue_body] Returning {len(devices)} devices", file=sys.stderr)
    return result


def main():
    print(f"[main] Called with args: {sys.argv}", file=sys.stderr)
    
    if len(sys.argv) < 2:
        logger.error("Usage: python parse_issue.py <issue_body_file> [output_file]")
        sys.exit(1)

    input_file = Path(sys.argv[1])
    output_file = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("parsed-issue.json")

    print(f"[main] Input file: {input_file}", file=sys.stderr)
    print(f"[main] Output file: {output_file}", file=sys.stderr)

    if not input_file.exists():
        logger.error(f"Input file not found: {input_file}")
        sys.exit(1)

    body = input_file.read_text(encoding="utf-8")
    print(f"[main] Read body: {len(body)} chars", file=sys.stderr)
    
    result = parse_issue_body(body)

    print(f"[main] Parsed result:", file=sys.stderr)
    print(f"[main]   Language: {result['language']}", file=sys.stderr)
    print(f"[main]   Devices: {len(result['devices'])}", file=sys.stderr)
    for i, device in enumerate(result['devices']):
        print(f"[main]   Device {i+1}: {device['vendor']}-{device['model']}", file=sys.stderr)
        print(f"[main]     uplinkData: {repr(device['uplinkData'][:100]) if device['uplinkData'] else 'EMPTY'}", file=sys.stderr)

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    logger.info(f"Successfully parsed issue into: {output_file}")


if __name__ == "__main__":
    main()
