import React from "react";

export class Animate extends React.Component {
  render() {
    var className = `animated ${this.props.animation}`;
    return <div className={className}>{this.props.children}</div>;
  }
}

Animate.defaultProps = {
  animation: "fadeInLeft"
};

export function randomAnimation() {
  return animations[Math.floor(Math.random() * animations.length)];
}

export function specialAnimation() {
  const animations = ["bounce", "flash", "pulse", "rubberBand", "shake"];
  return animations[Math.floor(Math.random() * animations.length)];
}

export const animations = [
  "bounce",
  "flash",
  "pulse",
  "rubberBand",
  "shake",
  "headShake	",
  "swing",
  "tada",
  "wobble	",
  "jello",
  "bounceIn",
  "bounceInDown",
  "bounceInLeft",
  "bounceInRight",
  "bounceInUp",
  // "bounceOut",
  // "bounceOutDown",
  // "bounceOutLeft",
  // "bounceOutRight",
  // "bounceOutUp",
  "fadeIn",
  "fadeInDown",
  "fadeInDownBig",
  "fadeInLeft",
  "fadeInLeftBig",
  "fadeInRight",
  "fadeInRightBig",
  "fadeInUp",
  "fadeInUpBig",
  // "fadeOut",
  // "fadeOutDown",
  // "fadeOutDownBig",
  // "fadeOutLeft",
  // "fadeOutLeftBig",
  // "fadeOutRight",
  // "fadeOutRightBig",
  // "fadeOutUp",
  //"fadeOutUpBig",
  "flipInX",
  "flipInY",
  //"flipOutX",
  //"flipOutY",
  "lightSpeedIn",
  //"lightSpeedOut",
  "rotateIn",
  "rotateInDownLeft",
  "rotateInDownRight",
  "rotateInUpLeft",
  "rotateInUpRight",
  // "rotateOut",
  // "rotateOutDownLeft",
  // "rotateOutDownRight",
  // "rotateOutUpLeft",
  // "rotateOutUpRight",
  //"hinge",
  "jackInTheBox",
  "rollIn",
  //"rollOut",
  // "zoomIn",
  // "zoomInDown",
  // "zoomInLeft",
  // "zoomInRight",
  // "zoomInUp",
  // "zoomOut",
  // "zoomOutDown",
  // "zoomOutLeft",
  // "zoomOutRight",
  // "zoomOutUp",
  "slideInDown",
  "slideInLeft",
  "slideInRight",
  "slideInUp",
  // "slideOutDown",
  // "slideOutLeft",
  // "slideOutRight",
  // "slideOutUp",
  "heartBeat"
];
