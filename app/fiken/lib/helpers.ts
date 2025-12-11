export const fetcher = async (url: string, token: string) => {
  if (!token) throw new Error("No token provided");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error: any = new Error("Failed to fetch");
    error.status = res.status;
    throw error;
  }

  return res.json();
};
