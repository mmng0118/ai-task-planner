import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import type { AnalyzeRequest, AnalyzeResponse } from "../../../lib/tasks";

const ai = new GoogleGenAI({});

const responseSchema = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          analysis: {
            type: "object",
            properties: {
              summary: { type: "string" },
              difficulty: { type: "integer" },
              estimatedHours: { type: "number" },
              subtasks: {
                type: "array",
                items: { type: "string" },
              },
              tip: { type: "string" },
            },
            required: ["summary", "difficulty", "estimatedHours", "subtasks", "tip"],
          },
        },
        required: ["id", "analysis"],
      },
    },
  },
  required: ["tasks"],
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequest;

    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash-lite",
      input: `次の学習タスクを分析してください。
「analysis.summary」は、入力された概要を事実に基づいて短く整理した文章にしてください。
- 出力言語は必ず日本語にしてください。概要が英語など外国語なら、日本語に翻訳してから要約してください。
- 何をする課題か、重要な条件、数値、評価基準など、入力に明記された重要事項だけを残してください。
- 原則1文、長くても2文・80字以内にしてください。80字を超えそうな場合は、重要な数値・条件・評価基準を優先して短くしてください。短い概要を不必要に言い換えて長くしないでください。
- 感想、推測、助言、入力にない情報は含めないでください。
- 箇条書きや前置きは使わず、概要欄にそのまま表示できる文章にしてください。
各タスクについて、難易度は1〜5にしてください。
予想時間は「時間」を単位とした数値（estimatedHours）で返してください。1時間以下は10分刻み（例：10分=0.17、30分=0.5、50分=0.83、60分=1）、1時間を超える場合は30分刻み（例：1.5、2、2.5）にしてください。1時間を超える値に10分刻みを使わないでください。
入力された概要を根拠に、現実的なサブタスクをいくつか作り、注意点やアドバイスも書いてください。
各タスクのidは、入力された値をそのまま使ってください。

タスク:
${JSON.stringify(body.tasks)}`,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: responseSchema,
      },
    });

    if (!interaction.output_text) {
      return NextResponse.json(
        { error: "Geminiから分析結果が返りませんでした。" },
        { status: 502 },
      );
    }

    const result = JSON.parse(interaction.output_text) as AnalyzeResponse;
    return NextResponse.json(result);
  } catch (error) {
    console.error("Gemini API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gemini APIで不明なエラーが発生しました。",
      },
      { status: 500 },
    );
  }
}
