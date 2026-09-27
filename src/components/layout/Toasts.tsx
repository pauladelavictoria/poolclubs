import { ToastContainer } from "react-toastify";

/** Toasts arrive with react-toastify's own stylesheet, but everything it draws
 *  reads a custom property and index.css points those at our tokens — so the
 *  surface turns over with [data-theme] on its own and there is no `theme` prop
 *  here to keep in step with it. */
export function Toasts() {
  return (
    <ToastContainer position="bottom-center" autoClose={2600} hideProgressBar />
  );
}
