import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import type { AnalyzeRequest, AnalyzeResponse } from "../../../lib/tasks";

export const maxDuration = 60;

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
      input: `学習タスクを分析し、指定されたJSON形式で簡潔な日本語の結果を返してください。
各タスクについて:
- summary: 入力に書かれた内容を事実に沿って1文、80字以内で要約。短い概要を長く言い換えず、推測や助言を混ぜない。
- difficulty: 課題の内容・作業量・必要な手順の複雑さで1〜5を判定する。1=とても簡単、2=簡単、3=標準的、4=難しい、5=非常に難しい。締切が近いことだけを理由に難易度を上げない。
- estimatedHours: 集中して実際に作業する時間の合計を時間単位の数値で返す。待ち時間や日数ではなく、課題に明記された分量と必要な作業だけを見積もる。通常の作業ペースと、資料が手元にある前提にする。入力にない大量の調査・推敲・やり直しを想定して時間を足さない。最悪の場合の時間ではなく、最もありそうな所要時間を出し、念のための上乗せをしない。課題の規模が不明な場合は大規模と決めつけず、小さめの一般的な課題として見積もる。1時間以下は10分刻み、1時間超は30分刻み。
- subtasks: 課題の規模に合わせて5〜8個。具体的で短い一作業に分け、必要な順に並べる。重複や入力にない作業は避ける。
- tip: 課題に即した2〜3文。最初の行動と重要な注意点を簡潔に伝え、入力にない条件を断定しない。
- idは入力値をそのまま使う。

タスク:
${JSON.stringify(body.tasks)}`,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: responseSchema,
      },
      generation_config: {
        thinking_level: "minimal",
        max_output_tokens: 1200,
      },
      store: false,
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
