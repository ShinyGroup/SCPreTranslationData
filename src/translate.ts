import log from "loglevel";
// const log = console
import axios from "axios";
import { systemPrompt, chinesePrompt } from "./prompts";
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
  max_tokens: number;
}

function splitCsvInfo(csvTextInfo: CsvTextInfo, batchNum: number){
  const batchSize = Math.ceil(csvTextInfo.data.length / batchNum)
  const rtn: CsvTextInfo[] = []
  for (let index = 0; index < batchNum; index++) {
    const startIndex = index * batchSize
    const endIndex = (index + 1) * batchSize
    rtn.push({
      data: csvTextInfo.data.slice(startIndex, Math.min(endIndex, csvTextInfo.data.length)),
      translator: csvTextInfo.translator,
      jsonUrl: csvTextInfo.jsonUrl,
    })
  }
  return rtn
}

function mergeCsvInfo(csvTextInfos: CsvTextInfo[]){
  const rtn: CsvTextInfo = {
    data: [],
    translator: csvTextInfos[0].translator,
    jsonUrl: csvTextInfos[0].jsonUrl,
  }
  for (let index = 0; index < csvTextInfos.length; index++) {
    const csvTextInfo = csvTextInfos[index];
    rtn.data.push(...csvTextInfo.data)
  }
  return rtn
}

export async function translateCsvString(
  csvText: string,
  config: LLMConfig,
  maxBatchSize: number = 60,
): Promise<string> {
  const csvTextInfo = extractInfoFromCsvText(csvText);
  const batchNum = Math.ceil(csvTextInfo.data.length / maxBatchSize)
  log.info(`Splitting csvTextInfo into ${batchNum} batches`)
  const csvTextInfos = splitCsvInfo(csvTextInfo, batchNum)
  await Promise.all(csvTextInfos.map(csvTextInfo => translateCsvTextInfo(csvTextInfo, config, 2)))
  return toCsvText(mergeCsvInfo(csvTextInfos));
}

export async function translateJsonDataToCsvString(data: any[], jsonPath: string, config: LLMConfig): Promise<string> {
  return await translateCsvString(jsonTextToCsvText(data, jsonPath), config);
}

// will modify csvTextInfo
async function translateCsvTextInfo(csvTextInfo: CsvTextInfo, config: LLMConfig, leftRetry=0) {
  const userInput = DialogueListDeser.serialize(csvTextInfo.data)
  const gptOutput = await chat(userInput, config)
  const translatedDialogues = DialogueListDeser.deserialize(gptOutput)
  if (csvTextInfo.data.length != translatedDialogues.length) {
    log.error(`Error: length of data (${csvTextInfo.data.length}) and translatedDialogues (${translatedDialogues.length}) is not equal`)
    if (leftRetry > 0) {
      log.info(`Retrying...`)
      return await translateCsvTextInfo(csvTextInfo, config, leftRetry - 1)
    }
    throw new Error("error: length of data and translatedDialogues is not equal")
  }
  for (let index = 0; index < translatedDialogues.length; index++) {
    const dialogue = translatedDialogues[index];
    if (dialogue == undefined) {
      log.error(`Error: dialogue is undefined at index ${index}`)
      continue
    }
    if (csvTextInfo.data[index] == undefined) {
      log.error(`Error: data is undefined at index ${index}`)
      log.error(csvTextInfo)
      throw new Error("error: data is undefined at index")
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
    max_tokens,
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
    log.info(`Sending request to ${model} API, please wait...`);
    const response = await openai.post(
      "/v1/chat/completions",
      {
        model,
        messages: [
          { role: "system", content: chinesePrompt },
          // { 'role': 'user', content: exampleInput },
          // {'role': 'assistant', content: exampleOutput},
          { role: "user", content: userInput },
        ],
        temperature: 0.7,
        max_tokens,
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
