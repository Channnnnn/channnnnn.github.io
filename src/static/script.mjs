export const getInitials = (fullName) => {
  if (typeof fullName === 'string') {
    const allNames = fullName
      .replace(/@(\w+\.)+\w+$/gu, '') /* remove email domain */
      .replace(/[\.\d_-]/gu, ' ') /* convert common delimit char */
      .replace(/[^\p{L} ]/gu, '') /* cleanup */
      .trim().split(' ');
    const initials = allNames.reduce((acc, curr, index) => {
      if (index === 0 || index === allNames.length - 1) {
        acc = `${acc}${curr.charAt(0).toUpperCase()}`;
      }
      return acc;
    }, '');
    return initials;
  }
  else {
    return 'Ø'
  }
}
