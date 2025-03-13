import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import puppeteer from 'puppeteer';

interface Player {
  name: string;
  completedSets: any[];
  currentSet: number;
  currentGame: number;
  isServing: boolean;
}

interface MatchConfig {
  type: 'match' | 'tiebreak' | null;
  tiebreakPoints: 7 | 10;
  noAd: boolean;
  firstServer: 1 | 2 | null;
  inTiebreak: boolean;
}

interface ScoreData {
  player1: Player;
  player2: Player;
  matchConfig: MatchConfig;
  pointTime: number;
}

/**
 * Generates an HTML scoreboard that can be used with FFmpeg
 */
const generateScoreboardHTML = (scoreData: ScoreData): string => {
  const { player1, player2, matchConfig } = scoreData;
  
  // For tiebreak mode, determine if we should show the last completed set
  const showCompletedTiebreak = matchConfig.type === 'tiebreak' && 
                               player1.completedSets.length > 0 && 
                               player2.completedSets.length > 0 && 
                               (player1.currentGame === 0 && player2.currentGame === 0);
                               
  // Get the last completed set scores for tiebreak mode
  const lastSetIndex = player1.completedSets.length - 1;
  const lastTiebreakScore1 = showCompletedTiebreak && lastSetIndex >= 0 ? player1.completedSets[lastSetIndex].score : null;
  const lastTiebreakScore2 = showCompletedTiebreak && lastSetIndex >= 0 ? player2.completedSets[lastSetIndex].score : null;
  
  const formatGameScore = (playerScore: number, otherPlayerScore: number): string => {
    switch (playerScore) {
      case 0: return '0';
      case 1: return '15';
      case 2: return '30';
      case 3: return '40';
      case 4: return 'AD';
      default: return playerScore.toString();
    }
  };

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        .overlay { 
          background: rgba(0, 0, 0, 0.75); 
          color: white; 
          padding: 8px; 
          border-radius: 4px; 
          width: 300px; 
          font-size: 14px;
        }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 4px 8px; text-align: center; }
        .player { text-align: left; font-weight: medium; padding-right: 12px; }
        .serving { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10B981; margin-left: 4px; }
        .won-set { font-weight: bold; }
        .tiebreak { font-size: 10px; vertical-align: super; margin-left: 2px; }
      </style>
    </head>
    <body>
      <div class="overlay">
        <table>
          <tbody>
            <tr>
              <td class="player">
                ${player1.name || 'Player 1'}${player1.isServing ? '<span class="serving"></span>' : ''}
              </td>
`;

  if (matchConfig.type === 'match') {
    player1.completedSets.forEach(setData => {
      html += `
        <td class="${setData.wonSet ? 'won-set' : ''}">
          ${setData.score}${setData.tiebreakScore !== undefined ? `<sup class="tiebreak">${setData.tiebreakScore}</sup>` : ''}
        </td>`;
    });
    html += `
      <td>${player1.currentSet}</td>
      <td>${matchConfig.inTiebreak ? player1.currentGame : formatGameScore(player1.currentGame, player2.currentGame)}</td>`;
  } else if (matchConfig.type === 'tiebreak') {
    html += `<td>${showCompletedTiebreak ? lastTiebreakScore1 : player1.currentGame}</td>`;
  }

  html += `</tr><tr><td class="player">${player2.name || 'Player 2'}${player2.isServing ? '<span class="serving"></span>' : ''}</td>`;

  if (matchConfig.type === 'match') {
    player2.completedSets.forEach(setData => {
      html += `
        <td class="${setData.wonSet ? 'won-set' : ''}">
          ${setData.score}${setData.tiebreakScore !== undefined ? `<sup class="tiebreak">${setData.tiebreakScore}</sup>` : ''}
        </td>`;
    });
    html += `
      <td>${player2.currentSet}</td>
      <td>${matchConfig.inTiebreak ? player2.currentGame : formatGameScore(player2.currentGame, player1.currentGame)}</td>`;
  } else if (matchConfig.type === 'tiebreak') {
    html += `<td>${showCompletedTiebreak ? lastTiebreakScore2 : player2.currentGame}</td>`;
  }

  html += `</tr></tbody></table></div></body></html>`;
  return html;
};

/**
 * Renders a video clip with a scoreboard overlay
 */
export async function renderClipWithScoreboard(
  inputPath: string,
  outputPath: string,
  startTime: number,
  duration: number,
  scoreData: ScoreData
): Promise<void> {
  try {
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const imagePath = path.join(os.tmpdir(), `scoreboard_${uuidv4()}.png`);
    await createScoreboardImage(scoreData, imagePath);
    const ffmpegCommand = `"${ffmpegPath}" -ss ${startTime} -to ${startTime + duration} -i "${inputPath}" -i "${imagePath}" -filter_complex "[0:v][1:v]overlay=10:(main_h-overlay_h-10)" -c:v libx264 -c:a aac -ar 48000 -b:a 192k "${outputPath}"`;
    await new Promise<void>((resolve, reject) => {
      exec(ffmpegCommand, (error) => {
        if (error) {
          console.error(`FFmpeg error: ${error.message}`);
          reject(error);
          return;
        }
        resolve();
      });
    });
    await fs.unlink(imagePath); // Clean up
  } catch (error) {
    console.error('Error in renderClipWithScoreboard:', error);
    throw error;
  }
}

/**
 * Creates a PNG image of the scoreboard that can be overlaid onto a video
 */
export const createScoreboardImage = async (scoreData: ScoreData, outputPath: string): Promise<string> => {
  try {
    const htmlContent = generateScoreboardHTML(scoreData);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    await page.setViewport({ width: 320, height: 100 }); // Adjust size as needed
    await page.screenshot({ path: outputPath, type: 'png', omitBackground: true });
    await browser.close();
    return outputPath;
  } catch (error) {
    console.error('Error creating scoreboard image:', error);
    throw error;
  }
};