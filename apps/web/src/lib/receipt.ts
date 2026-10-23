export interface ReceiptSplitResult {
  amount: number;
  memo: string;
  category: string;
  payee: string;
}

export interface ReceiptAnalysis {
  payee?: string;
  date?: string;
  splits?: ReceiptSplitResult[];
  receipt_total?: number;
}

const MAX_EDGE = 2000;

// Phone photos are often 5-10 MB; the backend accepts up to 10 MB and the model
// reads a 2000px JPEG just as well, so shrink before upload.
export async function shrinkImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 2_000_000) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    );
    return blob ?? file;
  } catch {
    // e.g. HEIC on browsers that cannot decode it: let the server try the original
    return file;
  }
}

async function postReceipt(backendUrl: string, groupId: string, image: Blob): Promise<Response> {
  const form = new FormData();
  form.append('file', image, 'receipt.jpg');
  return fetch(`${backendUrl}/receipts/analyze`, {
    method: 'POST',
    headers: { 'X-Sync-Group-ID': groupId },
    body: form,
  });
}

export async function analyzeReceipt(
  backendUrl: string,
  groupId: string,
  file: File
): Promise<ReceiptAnalysis> {
  const image = await shrinkImage(file);
  let res = await postReceipt(backendUrl, groupId, image);

  // The backend only scans for registered sync groups; the Vue app registered
  // on every sync, this client registers lazily on first scan.
  if (res.status === 401) {
    await fetch(`${backendUrl}/users/sync-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncGroupId: groupId }),
    });
    res = await postReceipt(backendUrl, groupId, image);
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      message = (await res.json()).error || message;
    } catch {
      // keep status text
    }
    if (res.status === 402) message = 'Brak kredytów na skanowanie paragonów';
    throw new Error(message);
  }
  return (await res.json()) as ReceiptAnalysis;
}
