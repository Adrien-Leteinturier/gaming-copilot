export async function withDeadline<T>(
  task: Promise<T>,
  milliseconds: number,
  cancel: () => void,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          try {
            cancel();
          } finally {
            reject(new Error(message));
          }
        }, milliseconds);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
