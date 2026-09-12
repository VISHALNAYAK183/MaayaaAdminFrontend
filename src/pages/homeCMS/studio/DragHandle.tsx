/** Six-dot grip. The only part of a row that starts a drag. */
const DragHandle = ({ disabled }: { disabled?: boolean }) => (
  <svg
    width="10"
    height="16"
    viewBox="0 0 10 16"
    className={disabled ? "text-gray-200 dark:text-gray-700" : "text-gray-400"}
    fill="currentColor"
    aria-hidden="true"
  >
    <circle cx="2" cy="3" r="1.4" />
    <circle cx="8" cy="3" r="1.4" />
    <circle cx="2" cy="8" r="1.4" />
    <circle cx="8" cy="8" r="1.4" />
    <circle cx="2" cy="13" r="1.4" />
    <circle cx="8" cy="13" r="1.4" />
  </svg>
);

export default DragHandle;
