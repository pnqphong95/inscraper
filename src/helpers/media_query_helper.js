
export function calculateNewMediaCount(currentCount, lastCount) {
  console.log(currentCount + ' ' + lastCount);
  if (lastCount === undefined || isNaN(lastCount) || currentCount <= lastCount) {
    return 0;
  }
  return currentCount - lastCount;
}