export interface TextOverlay {
  id: string
  text: string
  x: number       // 0.0〜1.0
  y: number       // 0.0〜1.0
  fontSize: number
  color: string
  bold: boolean
  shadow: boolean
  background: boolean   // 半透明背景ボックス
  bgOpacity: number     // 背景の不透明度 0.0〜1.0
}

export interface PhotoItem {
  id: string          // ローカルのUUID
  fileId?: string     // サーバーにアップロード後のID
  file: File
  previewUrl: string
  duration: number    // 表示秒数
  texts: TextOverlay[]
  cropX: number       // 水平位置 -0.5(左端)〜0(中央)〜0.5(右端)
  cropY: number       // 垂直位置 -0.5(上端)〜0(中央)〜0.5(下端)
}

export interface MusicItem {
  id: number
  name: string
  artist: string
  duration: number
  url: string
  previewUrl: string
}

export type Step = 1 | 2 | 3

export interface GenerateRequest {
  photos: {
    fileId: string
    duration: number
    texts: TextOverlay[]
    cropX: number
    cropY: number
  }[]
}
