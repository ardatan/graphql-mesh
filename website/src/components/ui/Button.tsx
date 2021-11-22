import { FC } from 'react';
import classnames from 'classnames';
import styles from './button.module.css';

const Button: FC<{ className: string; contained: boolean }> = props => {
  return (
    <button
      {...props}
      className={classnames(props.contained ? styles.buttonContained : styles.button, props.className)}
    >
      {props.children}
    </button>
  );
};

export default Button;
