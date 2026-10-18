import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer id="about">
      <Link className="logo" to="/">
        yozigo<span>.</span>
      </Link>

      <p>Your seat. Your story. Your movie night.</p>
    </footer>
  );
}

export default Footer;