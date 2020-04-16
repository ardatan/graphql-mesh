import styles from './button.module.css';
import React from 'react';
import classnames from 'classnames';

export default props => {
  return <button {...props} className={classnames(props.contained ? styles.buttonContained : styles.button, props.className)}>{props.children}</button>;
};
