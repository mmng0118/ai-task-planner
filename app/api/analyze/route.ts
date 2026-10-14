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
      input: `学習タスクを分析し、指定されたJSON形式で日本語の結果を返してください。入力に書かれた具体的な内容を残し、曖昧な一般論に置き換えないでください。
各タスクについて:
- summary: 入力に書かれた事実を日本語で要約する。目安は100〜180字。課題で何を作る・解く・提出するのか、明記された数・条件・提出形式・評価基準を省かず、読んだ人が作業内容を理解できる長さにする。短い入力は無理に引き延ばさない。推測や助言は混ぜない。
- difficulty: 課題の内容、入力に明記された作業量、手順の複雑さを1〜5で評価する。締切の近さは難易度に含めない。一般的な学生が取り組む通常規模の課題は星2を基準にする。作業が複数工程に分かれることや「レポート」「試験」などの種類だけでは加点しない。高い星は、入力に具体的な分量・難しい条件・高度な分析などの根拠がある場合に限る。判断に迷ったら低い方を選ぶ。
  1=短時間で終わる単純な確認・提出
  2=一般的な小〜標準規模の課題。通常の準備や複数の基本作業を含んでもよい
  3=明記された作業量が標準より多い、または少し複雑な条件・考察がある
  4=具体的に大きな分量、複数の成果物、難しい条件のいずれかが明記されている
  5=非常に大きな分量と高度な複雑さの両方が明確に示されている場合のみ
  入力に情報が少ない場合や規模が不明な場合は星2を選ぶ。難易度はタスクごとに独立して判断するが、無理に差をつけず、根拠が同程度なら同じ評価にする。
- estimatedHours: 集中して実際に作業する時間の合計を時間単位の数値で返す。待ち時間や日数ではなく、課題に明記された分量と必要な作業だけを見積もる。通常の作業ペースと、資料が手元にある前提にする。入力にない大量の調査・推敲・やり直しを想定して時間を足さない。最悪の場合の時間ではなく、最もありそうな所要時間を出し、念のための上乗せをしない。課題の規模が不明な場合は大規模と決めつけず、小さめの一般的な課題として見積もる。1時間以下は10分刻み、1時間超は30分刻み。
- subtasks: 課題の規模に合わせて5〜8個。具体的で短い一作業に分け、必要な順に並べる。重複や入力にない作業は避ける。
- tip: 課題に即した2〜3文。最初に取りかかる作業と重要な注意点を具体的に伝え、入力にない条件を断定しない。
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
        max_output_tokens: 2400,
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
