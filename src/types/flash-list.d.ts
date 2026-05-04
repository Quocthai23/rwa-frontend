declare module '@shopify/flash-list' {
  type FlashListProps<TItem> = {
    estimatedItemSize?: number | undefined;
    overrideItemLayout?: (
      layout: { size?: number | undefined; span?: number | undefined },
      item: TItem,
      index: number,
      maxColumns: number,
      extraData?: unknown,
    ) => void;
  };
}
