import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: '容易使用',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        任何PC,MAC电脑无需安装软件即可访问服务软件，无需设计人员，技术人员参与.
      </>
    ),
  },
  {
    title: '免费模版',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        丰富的模版库，免费使用，即见即所得、灵活设计定义布局.
      </>
    ),
  },
  {
    title: '丰富小插件',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
       视频播放器、图片列表播放器、幻灯片、天气、时钟、股票行情、社交媒体内容、新闻内容等.
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
