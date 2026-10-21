export async function extractPdfText(file: File): Promise<string> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("PDFファイルを選択してください。");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("PDFは10MB以下のファイルを選択してください。");
  }

  // PDF.jsはブラウザで使うため、関数が呼ばれた時点で読み込みます。
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  const pdf = await loadingTask.promise;

  try {
    if (pdf.numPages > 50) {
      throw new Error("PDFは50ページ以下のファイルを選択してください。");
    }

    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      const pageText = content.items
        .map((item) =>
          "str" in item && typeof item.str === "string" ? item.str : "",
        )
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (pageText) pages.push(pageText);
    }

    const extractedText = pages.join("\n");
    if (extractedText.length > 30_000) {
      throw new Error("PDFの文字数が多すぎます。30,000文字以内のPDFに分けてください。");
    }

    return extractedText;
  } finally {
    await loadingTask.destroy();
  }
}
