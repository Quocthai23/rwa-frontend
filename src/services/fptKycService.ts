export interface FptIdrResponse {
  errorCode: number;
  errorMessage: string;
  data: Array<{
    id: string;
    name: string;
    dob: string;
    sex: string;
    nationality: string;
    home: string;
    address: string;
    issue_date: string;
    issue_loc: string;
    type: string;
  }>;
}

export interface FptCheckFaceResponse {
  code: string;
  message: string;
  data: {
    match: boolean;
    similarity: number;
    isBothImgFace: boolean;
    isMatch: boolean;
  };
}

export const fptKycService = {
  /**
   * TrĂ­ch xuáº¥t thĂ´ng tin tá»« áº£nh máº·t trÆ°á»›c CCCD
   */
  async extractIdInfo(image: File): Promise<FptIdrResponse> {
    const formData = new FormData();
    formData.append('image', image);

    const response = await fetch('/api/fpt/idr', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to extract ID info: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * So khá»›p khuĂ´n máº·t giá»¯a CCCD vĂ  áº£nh Selfie
   */
  async checkFace(idImage: File, selfieImage: File): Promise<FptCheckFaceResponse> {
    const formData = new FormData();
    formData.append('file[]', idImage);
    formData.append('file[]', selfieImage);

    const response = await fetch('/api/fpt/checkface', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to check face: ${response.statusText}`);
    }

    return response.json();
  }
};

