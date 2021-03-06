
export type Handler =
  {
    type: 'text';
  }
  |
  {
    type: 'html-minify';
    position?: boolean
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
    type: 'vue3';
    position?: boolean
  }

export interface ConfigData {
  base?: string;
  files: string[];
  handler: (file: string) => Handler;
  out: string;
}

/**
 * @public
 */
export type Configuration = ConfigData
