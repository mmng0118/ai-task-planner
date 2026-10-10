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
              estimatedHours: { type: "integer" },
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
入力内容が日本語以外の場合には、日本語に翻訳してください。
入力された概要を、内容を保ったまま理解しやすく整理した「summary」も作ってください。
元の概要が長い場合は重要な作業だけを抜粋してまとめ、元の概要が短い場合も「何を」「どのようにするか」が分かる表現に整えてください。
入力にない情報や具体的な条件は追加しないでください。
各タスクについて、難易度は1〜5、予想時間は時間単位の整数にしてください。
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
