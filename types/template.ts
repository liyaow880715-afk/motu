export interface TemplateModule {
  type: string;
  order: number;
  name: string;
  aspectRatio: string;
  styleNotes: string;
  textLayout: string;
  bgType: string;
  position?: {
    topPercent: number;
    bottomPercent: number;
  };
}

export interface TemplateStyleProfile {
  overallStyle: string;
  colorPalette: string[];
  typography: {
    heading: string;
    subheading: string;
    body: string;
    tags: string;
  };
}

export interface TemplateStructure {
  overallStyle: string;
  colorPalette: string[];
  typography: TemplateStyleProfile["typography"];
  modules: TemplateModule[];
}

export interface TemplateRecord {
  id: string;
  name: string;
  referenceImageUrl: string;
  structureJson: TemplateStructure;
  styleProfile: TemplateStyleProfile;
  category: string;
  description: string | null;
  rawAnalysis: string | null;
  moduleCount: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}
