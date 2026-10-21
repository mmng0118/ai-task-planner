export async function extractDocxText(file: File): Promise<string> {
  if (!file.name.toLowerCase().endsWith(".docx")) {
    throw new Error("Wordファイル（.docx）を選択してください。古い.doc形式には対応していません。");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Wordファイルは10MB以下のファイルを選択してください。");
  }

  // Mammothはブラウザ上でDOCXの本文を抽出します。
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  });
  const extractedText = result.value.trim();

  if (!extractedText) {
    throw new Error("Word文書から文字を取り出せませんでした。");
  }

  if (extractedText.length > 30_000) {
    throw new Error("Word文書の文字数が多すぎます。30,000文字以内にしてください。");
  }

  return extractedText;
}
