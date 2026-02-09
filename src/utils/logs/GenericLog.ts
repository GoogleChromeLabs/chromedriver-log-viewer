/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { LogEntry } from '../../types/log';

export abstract class GenericLog {
  abstract parse(content: string): LogEntry[];

  protected postProcess(entries: LogEntry[]): LogEntry[] {
    // Post-processing: Correlate commands and responses and calculate lanes
    const pendingCommands = new Map<number, number>(); // cmdId (from log) -> entryId (index in entries)
    
    // Feature: Stack-based correlation for WebDriver commands (ID-less) or similar stacks
    const stack: number[] = []; 
    // We might need separate stacks if we have multiple types ID-less logs, 
    // but typically we only have one "stack" context or they are interleaved.
    // For now assuming one global stack for ID-less correlation is fine.
    
    let syntheticIdCounter = -1; // Use negative IDs for synthesized ones
  
    const newSyntheticId = () => syntheticIdCounter--;
  
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      // Logic for ID-based vs Stack-based correlation
      
      // Heuristic: If it has a commandId (positive), use map-based correlation.
      // If it doesn't, or refers to "WebDriver" type, use stack-based.
      
      if (entry.commandId !== undefined && entry.commandId > 0) {
         // ID-based correlation (DevTools, WPT, Puppeteer with IDs)
         if (entry.isCommand) {
           pendingCommands.set(entry.commandId, i);
         } else if (entry.isResponse) {
           const cmdIndex = pendingCommands.get(entry.commandId);
           if (cmdIndex !== undefined) {
             const cmdEntry = entries[cmdIndex];
             
             if (!entry.relatedIds) entry.relatedIds = [];
             entry.relatedIds.push(cmdEntry.id);
             
             if (!cmdEntry.relatedIds) cmdEntry.relatedIds = [];
             cmdEntry.relatedIds.push(entry.id);
             
             pendingCommands.delete(entry.commandId); 
           }
         }
      } else if (entry.logType === 'WebDriver' || (entry.commandId === undefined && entry.isCommand)) {
         // Stack-based correlation
         if (entry.isCommand) {
           entry.commandId = newSyntheticId();
           stack.push(i);
         } else if (entry.isResponse) {
           if (stack.length > 0) {
             const cmdIndex = stack.pop()!;
             const cmdEntry = entries[cmdIndex];
             
             entry.commandId = cmdEntry.commandId; 
             
             if (!entry.relatedIds) entry.relatedIds = [];
             entry.relatedIds.push(cmdEntry.id);
             
             if (!cmdEntry.relatedIds) cmdEntry.relatedIds = [];
             cmdEntry.relatedIds.push(entry.id);
           }
         }
      }
    }
  
    // Second pass: assign lanes based on meaningful pairs
    const commandToLane = new Map<number, number>(); // Entry ID -> Lane Index
    const laneToCommand = new Map<number, number>(); // Lane Index -> Command ID
    const laneToEntryIndex = new Map<number, number>(); // Lane Index -> Entry Index
    const occupiedLanes = new Set<number>(); // Set of currently used lane indices
  
    const getFreeLane = () => {
      let lane = 0;
      while (occupiedLanes.has(lane)) {
        lane++;
      }
      return lane;
    };
  
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      let currentStartLane: number | undefined = undefined;
      let currentEndLane: number | undefined = undefined;
  
      // Use relatedIds[0] for lane logic
      const primaryRelatedId = entry.relatedIds?.[0];
  
      if (entry.isCommand && primaryRelatedId !== undefined && entry.commandId !== undefined) {
        // Start of a connection
        const lane = getFreeLane();
        occupiedLanes.add(lane);
        commandToLane.set(entry.id, lane); 
        laneToCommand.set(lane, entry.commandId);
        laneToEntryIndex.set(lane, i);
        currentStartLane = lane;
      } 
      else if (entry.isResponse && primaryRelatedId !== undefined) {
        // End of a connection
        const lane = commandToLane.get(primaryRelatedId);
        if (lane !== undefined) {
          currentEndLane = lane;
        }
      }
  
      // Snapshot active lanes
      const activeLanes = Array.from(occupiedLanes).sort((a, b) => a - b);
      const laneDetails: Record<number, number> = {};
      const laneEntryIndices: Record<number, number> = {};
  
      activeLanes.forEach(lane => {
        const cmdId = laneToCommand.get(lane);
        if (cmdId !== undefined) {
          laneDetails[lane] = cmdId;
        }
        const entryIdx = laneToEntryIndex.get(lane);
        if (entryIdx !== undefined) {
          laneEntryIndices[lane] = entryIdx;
        }
      });
  
      entry.laneConfig = {
        activeLanes,
        laneDetails,
        laneEntryIndices, 
        startLane: currentStartLane,
        endLane: currentEndLane
      };
  
      // Cleanup after row processing
      if (currentEndLane !== undefined) {
        occupiedLanes.delete(currentEndLane);
        if (primaryRelatedId !== undefined) commandToLane.delete(primaryRelatedId);
        laneToCommand.delete(currentEndLane);
        laneToEntryIndex.delete(currentEndLane);
      }
    }
  
    return entries;
  }
}
