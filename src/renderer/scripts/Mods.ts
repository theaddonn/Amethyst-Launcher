import * as fs from 'fs'
import * as path from 'path'
import { ajv, FromValidatedV1_0_0ToConfig, ModConfigV1_0_0, ValidateModSchemaV1_0_0 } from './modConfig/ModConfigV1_0_0'
import { ModsFolder } from './Paths'
import { IntermediateModConfig } from './modConfig/IntermediateModConfig';
import { FromValidatedV1_1_0ToConfig, ModConfigV1_1_0, ValidateModSchemaV1_1_0 } from './modConfig/ModConfigV1_1_0';

export function GetAllMods(): ValidatedMod[] {
  if (!fs.existsSync(ModsFolder)) return [];

  const allFolders = fs.readdirSync(ModsFolder, { withFileTypes: true })
    .filter((f) => f.isDirectory())
    .map((dir) => dir.name);

  const result: ValidatedMod[] = [];

  allFolders.forEach((modIdentifier) => {
    const validated = ValidateMod(modIdentifier);
    result.push(validated);
  });

  return result;
}

export type ValidatedMod = 
  | { ok: true; config: IntermediateModConfig; errors: [], id: string }
  | { ok: false, config: undefined, errors: string[], id: string };

export function ValidateMod(id: string): ValidatedMod {
  const modConfigPath = path.join(ModsFolder, id, 'mod.json')
  let configUnchecked: Record<any, any> = {};

  try {
    const configDataText = fs.readFileSync(modConfigPath, 'utf-8');
    configUnchecked = JSON.parse(configDataText);
  }
  catch (e) {
    return {
      ok: false,
      errors: ["Failed to read/parse config.json"],
      config: undefined,
      id
    }
  }

  // if format_version field is not present, inject the 1.0.0 format_version
  // this is needed for old mods to still be able to correctly validate :)
  if (configUnchecked["format_version"] === undefined) {
    configUnchecked["format_version"] = "1.0.0"
  }

  if (configUnchecked["format_version"] === "1.0.0") {
    const success = ValidateModSchemaV1_0_0(configUnchecked);

    if (!success) return {
      ok: false,
      config: undefined,
      errors: ajv.errorsText(ValidateModSchemaV1_0_0.errors, { dataVar: "mod.config/", separator: "\n" }).split("\n"),
      id
    }

    return {
      ok: true,
      errors: [],
      config: FromValidatedV1_0_0ToConfig(configUnchecked as ModConfigV1_0_0),
      id
    }
  }

  if (configUnchecked["format_version"] === "1.1.0") {
    const success = ValidateModSchemaV1_1_0(configUnchecked);

    if (!success) return {
      ok: false,
      config: undefined,
      errors: ajv.errorsText(ValidateModSchemaV1_1_0.errors, { dataVar: "mod.config/", separator: "\n" }).split("\n"),
      id
    }

    return {
      ok: true,
      errors: [],
      config: FromValidatedV1_1_0ToConfig(configUnchecked as ModConfigV1_1_0),
      id
    }
  }
  
  return {
    ok: false,
    config: undefined,
    errors: [
      `Unknown format_version "${configUnchecked["format_version"]}"`
    ],
    id
  }
}