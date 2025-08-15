import { useCallback, useMemo } from "react";

export function useRecordArrayAdapter<
  TKey extends string | number,
  TValue,
  RecordType extends Partial<Record<TKey, TValue>> = Partial<
    Record<TKey, TValue>
  >,
>(
  records: RecordType,
  onChange: (value: RecordType) => void
): [
  [TKey, TValue][],
  (value: [TKey, TValue][]) => void | Promise<void>
] {
  const recordArray = useMemo(
    () => Object.entries(records) as [TKey, TValue][],
    [records]
  );
  const setRecord = useCallback(
    (value: [TKey, TValue][]) => {
      const newRecords: RecordType = {} as RecordType;
      value.forEach(([key, val]) => {
        newRecords[key as keyof RecordType] = val as RecordType[keyof RecordType];
      });
      onChange(newRecords);
    },
    [onChange]
  );

  return [recordArray, setRecord];
}
