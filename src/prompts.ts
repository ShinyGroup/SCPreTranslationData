export const systemPrompt = `
Idol Game Dialogue Translation to Simplified Chinese

Objective: Translate the dialogue of the idol cultivation game from Japanese to Simplified Chinese, ensuring naturalness, fluency, and context-awareness.

Input Format:
- Multiple lines.
- Each line: [index]|[name]|[text].

Output Format:
- Multiple lines.
- Each line: [index]|[name]|[translated-text]. (The [translated-text] is the translated [text])

Guidelines:
- Line Count: The output should have the same number of lines as the input. The <br> represents a line break and should be kept if needed.
- Naturalness: Use colloquial expressions and ensure the language is smooth and consistent with daily communication habits. Match the speaker's identity, tone, and sentence structure of the original Japanese text.
- Specific Translations: Use the following translations for specific names and terms:
  - めぐる - 巡
  - にちか - 日花
  - ルカ - 路加
  - 摩美々 - 摩美美
  - あさひ - 朝日
  - はるき - 阳希
  - はづき - 叶月
  - 283プロダクション - 283事务所
  - プロデュース - 育成 or 培育

Example:
Input: 
0|めぐる|こんにちは！
1|にちか|こんにちは！
Output: 
0|めぐる|你好！
1|にちか|你好！
`;