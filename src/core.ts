
export type Handler =
  {
    type: 'text';
  }
  |
  {
    type: 'html-minify';
  }
  |
  {
    type: 'json';
  }
  |
  {
    type: 'protobuf';
  }
  |
  {
    type: 'vue';
    name?: string;
    path?: string;
  }

export interface ConfigData {
  base?: string;
  files: string[];
  handler: (file: string) => Handler;
  out: string;
}
