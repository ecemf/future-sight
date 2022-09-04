import React, { useState } from 'react';
import { Button, Input, Divider, Image } from 'antd';
import { Link } from 'react-router-dom';

const HomeView: React.FC = () => {
  const [draftFromURL, setDraftFromURL] = useState('');

  const getDraftsElement = () => {
    if (localStorage.length > 1) {
      return <Link to="drafts">Continue from a draft</Link>;
    }
    if (localStorage.length === 1) {
      const url = `draft?id=${localStorage.key(0)}`;
      return <Link to={url}>Continue from the last draft</Link>;
    } else {
      return null;
    }
  };

  return (
    <div className="container">
      <h2>Welcome to FutureSight!</h2>
      <Button type="primary">
        <Link to="draft">Create a new Dashboard</Link>
      </Button>
      {getDraftsElement()}
      <Input.Group style={{ display: 'flex', flexDirection: 'row' }}>
        <Button type="primary" disabled={!draftFromURL}>
          Start from another Dashboard
        </Button>
        <Input
          placeholder="https://..."
          value={draftFromURL}
          onChange={(e) => setDraftFromURL(e.target.value)}
        />
      </Input.Group>
      <Divider />
      <h3>Latest submissions</h3>
      <Image.PreviewGroup>
        {Object.keys(localStorage).map((key) => (
          <Link key={key} to={'draft?id=' + key}>
            <Image
              width={200}
              height={200}
              src="https://webcolours.ca/wp-content/uploads/2020/10/webcolours-unknown.png"
            />
          </Link>
        ))}
      </Image.PreviewGroup>
    </div>
  );
};

export default HomeView;
