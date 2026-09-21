import { useNavigate } from "react-router";

/**
 * Back one step, like the browser's own back button. When there is nothing to
 * go back to inside the panel - the page was opened from a link or a new tab -
 * it goes to `fallback` instead of leaving the panel.
 */
const useGoBack = (fallback: string = "/") => {
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1); // Go back to the previous page
    } else {
      navigate(fallback); // Nothing to go back to: the parent page instead
    }
  };

  return goBack;
};

export default useGoBack;
