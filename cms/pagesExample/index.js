import React from "react";

import { Typography, Paper, Grid } from "@mui/core";
import { Toolbox } from "./Toolbox";
import { SettingsPanel } from "./SettingPanel";
import { Topbar } from "./Topbar";
import { Container } from "./Container";
import { Button } from "./Button";
import { Text } from "./Text";
import { Card, CardBottom, CardTop } from "./Card";

import { Editor, Frame, Element } from "@craftjs/core";
import { useNode } from "@craftjs/core";

export default function App() {
  return (
    <div style={{ margin: "0 auto", width: "800px" }}>
      <Typography variant="h5" align="center">
        A super simple page editor
      </Typography>
      <Editor resolver={{ Card, Button, Text, Container, CardTop, CardBottom }}>
        <Grid container spacing={3} style={{ paddingTop: "10px" }}>
          <Topbar />
          <Grid item xs>
            <Frame>
              <Element is={Container} padding={5} background="#eee" canvas>
                <Container padding={5} background="#eee">
                  <Card />
                  <Button size="small" variant="outlined">
                    Click
                  </Button>

                  <Text fontSize="24" text="Hi world!" />
                  <Element is={Container} padding={2} background="#999" canvas>
                    <Text fontSize="16" text="It's me again!" />
                  </Element>
                </Container>
              </Element>
            </Frame>
          </Grid>
          <Grid item xs={3}>
            <Paper>
              <Toolbox />
              <SettingsPanel />
            </Paper>
          </Grid>
        </Grid>
      </Editor>
    </div>
  );
}
