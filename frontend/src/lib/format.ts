export const formatBigint = (value: bigint): string => {
  const source = value.toString();
  return source.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export const truncateAddress = (address: string): string => {
  if (address.length < 12) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-5)}`;
};
