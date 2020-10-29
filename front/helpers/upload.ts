export const upload = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const element = document.createElement('input');
    element.type = 'file';

    //@ts-ignore
    element.onchange = async (e: { target: { files: { text: () => string }[] } }) => {
      const text = await e.target.files[0].text();
      console.log(text);
      resolve(text);
    };
    element.onerror = reject;
    element.click();

  })
}
