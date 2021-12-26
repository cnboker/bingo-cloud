import React, { useState, useEffect } from 'react';
import { hot } from 'react-hot-loader/root';
import Example from './Example'
const useGithub = userName => {
  const [user, setUser] = useState();
  useEffect(() => {
    fetch(`https://api.github.com/users/${userName}`)
      .then(r => r.json())
      .then(setUser);
  }, [userName]);

  return user;
};

function App() {
  const user = useGithub('ReeganExE');

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      Hello <b>{user.login}</b>
      <p>{user.bio}</p>
      <Example></Example>
    </div>
  );
}

export default hot(App);