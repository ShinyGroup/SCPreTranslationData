import log from "loglevel";
// const log = console
import axios from "axios";
import { systemPrompt } from "./prompts";
import { CsvTextInfo, toCsvText, jsonTextToCsvText, extractInfoFromCsvText, } from "./csv"

interface Dialogue {
  name: string;
  text: string;
}

export interface LLMConfig {
  // systemPrompt: string | undefined;
  apiKey: string;
  baseURL: string;
  model: string;
}

export async function translateCsvString(
  csvText: string,
  config: LLMConfig
): Promise<string> {
  const csvTextInfo = extractInfoFromCsvText(csvText);
  await translateCsvTextInfo(csvTextInfo, config);
  return toCsvText(csvTextInfo);
}

export async function translateJsonDataToCsvString(data: any[], jsonPath: string, config: LLMConfig): Promise<string> {
  return await translateCsvString(jsonTextToCsvText(data, jsonPath), config);
}

// will modify csvTextInfo
async function translateCsvTextInfo(csvTextInfo: CsvTextInfo, config: LLMConfig) {
  const userInput = DialogueListDeser.serialize(csvTextInfo.data)
  const gptOutput = await chat(userInput, config)
  const translatedDialogues = DialogueListDeser.deserialize(gptOutput)
  for (let index = 0; index < translatedDialogues.length; index++) {
    const dialogue = translatedDialogues[index];
    if (dialogue == undefined) {
      log.error(`Error: dialogue is undefined at index ${index}`)
      continue
    }
    csvTextInfo.data[index].trans = dialogue.text
  }
  csvTextInfo.translator = config.model
}

const DialogueListDeser = {
  serialize(dialogues: Dialogue[]): string {
    let rtn = ""
    for (let index = 0; index < dialogues.length; index++) {
      const dialogue = dialogues[index];
      rtn += `${index}|${dialogue.name}|${dialogue.text.replaceAll("\\n", "<br>")}\n`
    }
    // log.debug(`Serialized: ${rtn}`)
    return rtn;
  },
  deserialize(gptOutput: string): Dialogue[] {
    let rtn: Dialogue[] = []
    const lines = gptOutput.split("\n")
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const parts = line.split("|")
      if (parts.length == 3) {
        const dialogue: Dialogue = {
          name: parts[1],
          text: parts[2].replaceAll("<br>", "\\n")
        }
        // notice: we are using rtn[index] instead of pushing
        rtn[index] = dialogue
      }
    }
    return rtn;
  }
}

async function chat(
  userInput: string,
  {
    apiKey,
    baseURL,
    model,
  }: LLMConfig
) {
  try {
    const openai = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
    log.log(`Sending request to ${model} API, please wait...`);
    const response = await openai.post(
      "/v1/chat/completions",
      {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          // { 'role': 'user', content: exampleInput },
          // {'role': 'assistant', content: exampleOutput},
          { role: "user", content: userInput },
        ],
        temperature: 0.5,
        max_tokens: 4096,
      },
      {
        timeout: 180000,
      }
    );

    const generatedText = response.data.choices[0].message.content;
    const tokenConsumed = response.data.usage.total_tokens;
    log.debug(`Generated Text: ${generatedText}`);
    log.debug(`Consumed token: ${tokenConsumed}`);
    return generatedText;
  } catch (error) {
    log.error(`Error: ${error.message}`);
    log.error(`Error: ${error.response.data.error.message}`);
    throw new Error(error.response.data.error.message);
  }
}
