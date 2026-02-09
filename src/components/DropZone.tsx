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

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import './DropZone.css';

interface DropZoneProps {
  onFileLoaded: (content: string, fileName: string) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFileLoaded }) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        const reader = new FileReader();

        reader.onabort = () => console.log('file reading was aborted');
        reader.onerror = () => console.log('file reading has failed');
        reader.onload = () => {
          const binaryStr = reader.result;
          if (typeof binaryStr === 'string') {
            onFileLoaded(binaryStr, file.name);
          }
        };
        reader.readAsText(file);
      });
    },
    [onFileLoaded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.log', '.txt', '.json'] },
  });

  return (
    <div className={`dropzone ${isDragActive ? 'active' : ''}`} {...getRootProps()}>
      <input {...getInputProps()} />
      <UploadCloud className="icon" size={48} />
      {isDragActive ? (
        <p>Drop the file here ...</p>
      ) : (
        <p>Drag 'n' drop a ChromeDriver log file here, or click to select file</p>
      )}
    </div>
  );
};
