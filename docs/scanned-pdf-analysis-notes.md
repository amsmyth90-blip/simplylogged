# Scanned PDF Analysis Fixture Notes

Use a non-sensitive scanned/image-only PDF for manual testing. A useful fixture shape is:

- File name: `scanned-bank-statement-6-months.pdf`
- Content: first 1-3 pages of a bank statement rendered as page images, not selectable text
- Expected analysis path: `Analysed with PDF vision`
- Expected category: `Bank Statement`
- Expected room: `Office` or `Safe Room`
- Expected privacy behavior: account numbers are masked to last four digits only

Do not commit real bank statements or documents containing personal data.
