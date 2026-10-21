# Gift Voucher Studio UI

## Visual direction

Use a light, gallery-like interface inspired by the supplied Apple product-page reference. Keep the voucher artwork as the visual centerpiece and keep app controls quiet and easy to scan.

## Color tokens

| Token | Value | Use |
| --- | --- | --- |
| Gallery white | `#ffffff` | Main surfaces, editor and library rows |
| Studio mist | `#f5f5f7` | App background and secondary sections |
| Paper frost | `#fafafc` | Search and subtle utility surfaces |
| Hairline silver | `#d6d6d6` | Dividers and low-emphasis borders |
| Control gray | `#e6e6e8` | Disabled controls and subtle fills |
| Ink | `#1d1d1f` | Headings, labels, and primary text |
| Slate | `#707070` | Helper text and metadata |
| Steel | `#86868b` | Input outlines and inactive indicators |
| Apple blue | `#0066cc` | Links and focus states |
| Pricing blue | `#0071e3` | Primary actions |
| Launch orange | `#b64400` | Small status annotations |

## Type, spacing, and shape

- Use the system sans stack for interface text; keep Canela reserved for voucher artwork.
- Use compact, lightly tracked labels and readable 14–17px body copy.
- Work from a 4px spacing unit, with 20px gaps between related controls and generous space between sections.
- Use 28px corners for major surfaces, pill buttons, and 14px corners for form fields.
- Keep surfaces flat. Separate content with whitespace and thin borders instead of shadows.
- Keep touch targets at least 40px tall on mobile, account for safe areas, and maintain visible keyboard focus.

## Application patterns

- Keep the editor and navigation compact so the voucher preview remains prominent.
- Use white content surfaces on the `#f5f5f7` canvas; keep the voucher itself unchanged.
- Use blue sparingly for primary actions, links, and focus indicators.
- Present the saved-voucher library as a centered dialog on larger screens and a bottom sheet on phones.
- Preserve the light theme as the default while keeping the dark theme readable.
