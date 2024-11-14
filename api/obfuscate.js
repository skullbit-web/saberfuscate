import { exec } from 'child_process'; // To run CLI commands
import fs from 'fs';
import path from 'path';
import tmp from 'tmp'; // For temporary file creation

// Helper function to run Lua CLI
const runLuaCLI = (inputFilePath, outputFilePath, preset = 'Medium') => {
  return new Promise((resolve, reject) => {
    const command = `lua prometheus/cli.lua --preset ${preset} ${inputFilePath} -o ${outputFilePath}`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error executing Lua CLI: ${stderr || error.message}`);
        return;
      }
      resolve(outputFilePath);
    });
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send({ message: 'Only POST requests allowed' });
  }

  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).send({ message: 'Invalid code provided' });
  }

  try {
    // Create a temporary file for the user's Lua code
    const tempInputFile = tmp.tmpNameSync({ postfix: '.lua' });
    fs.writeFileSync(tempInputFile, code);

    // Create a temporary file to store the obfuscated code
    const tempOutputFile = tmp.tmpNameSync({ postfix: '.lua' });

    // Run the Lua CLI to obfuscate the code
    const obfuscatedFilePath = await runLuaCLI(tempInputFile, tempOutputFile);

    // Read the obfuscated code (you can return it directly as an attachment)
    const obfuscatedCode = fs.readFileSync(obfuscatedFilePath);

    // Clean up the temporary files
    fs.unlinkSync(tempInputFile);
    fs.unlinkSync(obfuscatedFilePath);

    // Send the obfuscated code back to the user
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=obfuscated_code.lua`);
    res.status(200).send(obfuscatedCode);

  } catch (error) {
    console.error('Error processing the Lua code:', error);
    res.status(500).send({ message: 'Error processing code' });
  }
}
