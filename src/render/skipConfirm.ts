let skipBuildConfirm = false;

export function getSkipBuildConfirm(): boolean {
  return skipBuildConfirm;
}

export function setSkipBuildConfirm(value: boolean): void {
  skipBuildConfirm = value;
}
