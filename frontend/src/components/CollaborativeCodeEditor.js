import { useEffect, useState } from "react";
import { Box, MenuItem, Select, Stack } from "@mui/material";
import Editor from "@monaco-editor/react";

const CollaborativeCodeEditor = (props) => {
  const [theme, setTheme] = useState("vs-light");
  const [languageMap, setLanguageMap] = useState({});
  const [languageSlug, setLanguageSlug] = useState("");
  const [code, setCode] = useState("");
  const { socket, collabData } = props;
  const { roomId, questionSet } = collabData;
  const question = questionSet[0];

  useEffect(() => {
    const initLanguageMap = () => {
      const { codeSnippets } = question;

      const languageMap = {};
      for (const codeSnippet of codeSnippets) {
        const { slug, name, code } = codeSnippet;
        const languageObj = {
          name,
          code,
        };
        languageMap[slug] = languageObj;
      }
      return languageMap;
    };

    // initialise state if it does not exist
    if (Object.keys(languageMap).length === 0) {
      const languageMap = initLanguageMap();
      const firstSlug = Object.keys(languageMap)[0];
      setLanguageMap(languageMap);
      setLanguageSlug(firstSlug);
      setCode(languageMap[firstSlug].code);
    }

    socket.on("receiveLanguage", ({ language }) => {
      updateCode(languageMap[language].code);
      setLanguageSlug(language);
    });

    socket.on("receiveCurrentCode", ({ code }) => {
      setCode(code);
    });

    return () => {
      socket.off("receiveLanguage");
      socket.off("receiveCurrentCode");
    };
  }, [languageMap]);

  const updateTheme = (event) => {
    setTheme(event.target.value);
  };

  const updateLanguage = (event) => {
    const language = event.target.value;
    socket.emit("sendLanguage", { roomId, language });
  };

  const updateCode = (code) => {
    socket.emit("sendCurrentCode", { roomId, code });
  };

  return (
    <Stack
      height={props.hidden === true ? "100%" : "0"}
      visibility={props.hidden === true ? "none" : "hidden"}
      maxHeight="100%"
    >
      <Box marginTop="10px" marginBottom="10px" spacing="10">
        <Select
          sx={{ marginRight: "10px" }}
          value={theme}
          onChange={updateTheme}
        >
          <MenuItem key="vs-light" value="vs-light">
            Light
          </MenuItem>
          <MenuItem key="vs-dark" value="vs-dark">
            Dark
          </MenuItem>
        </Select>
        <Select value={languageSlug} onChange={updateLanguage}>
          {Object.keys(languageMap).map((slug) => {
            const language = languageMap[slug];
            return (
              <MenuItem key={slug} value={slug}>
                {language.name}
              </MenuItem>
            );
          })}
        </Select>
      </Box>
      <Editor
        theme={theme}
        language={languageSlug}
        value={code}
        onChange={updateCode}
      />
    </Stack>
  );
};

export { CollaborativeCodeEditor };
