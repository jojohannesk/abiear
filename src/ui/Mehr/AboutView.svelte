<script lang="ts">
  // Über die App — und die Lizenzhinweise der mitgelieferten Fremdbestandteile,
  // fest im Quelltext. Aus `Views/AboutView.swift`.
  import TopBar from "../Bausteine/TopBar.svelte";
  import { VERSION } from "../../plattform/Rechtliches";

  interface Props { onClose: () => void }
  let { onClose }: Props = $props();

  const abcjsLicense = `Copyright (c) 2009-2023 Paul Rosen and Gregory Dyke

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

  const salamanderNote = `Die Klaviertöne stammen aus dem Salamander Grand Piano von Alexander Holm und stehen unter Creative Commons Attribution 3.0. Sie dürfen unter Namensnennung verwendet, verändert und weitergegeben werden. Die hier gebündelten Dateien stammen aus der von Tone.js verteilten Fassung.

Lizenztext: creativecommons.org/licenses/by/3.0`;

  const credits = [
    { label: "Notensatz", title: "abcjs 6.2.2", author: "Paul Rosen und Gregory Dyke", link: "abcjs.net", licenseName: "MIT-Lizenz", text: abcjsLicense },
    { label: "Klaviertöne", title: "Salamander Grand Piano", author: "Alexander Holm", link: "archive.org/details/SalamanderGrandPianoV3", licenseName: "Creative Commons Attribution 3.0 (CC-BY 3.0)", text: salamanderNote },
  ];
</script>

<div class="seite">
  <TopBar title="Über" {onClose} />
  <div class="scroll">
    <div class="inhalt about">
      <div class="app">
        <div class="t-display c-text">AbiEar</div>
        <div class="t-small c-secondary ziffern">Version {VERSION}</div>
        <p class="t-small c-secondary beschreibung">Übungsprogramm für die Gehörbildung im Abitur Baden-Württemberg: Intervalle, Akkorde, Rhythmus- und Melodiediktat.</p>
      </div>
      {#each credits as c}
        <section class="credit">
          <div class="t-label">{c.label}</div>
          <div class="karte block">
            <div class="t-headline c-text">{c.title}</div>
            <div class="t-small c-secondary">{c.author}</div>
            <div class="t-tiny c-accent">{c.link}</div>
            <div class="t-tiny c-tertiary lizenzname">{c.licenseName}</div>
            <pre class="lizenz c-tertiary">{c.text}</pre>
          </div>
        </section>
      {/each}
    </div>
  </div>
</div>

<style>
  p { margin: 0; }
  .about { padding-top: var(--space-l); padding-bottom: calc(var(--space-xl) + var(--sicher-unten)); display: flex; flex-direction: column; gap: var(--space-xl); }
  .app { display: flex; flex-direction: column; gap: var(--space-xxs); }
  .app .t-display { letter-spacing: -0.6px; }
  .beschreibung { padding-top: var(--space-s); line-height: 1.5; }
  .credit { display: flex; flex-direction: column; gap: var(--space-s); }
  .block { padding: var(--space-m); display: flex; flex-direction: column; gap: var(--space-xs); }
  .lizenzname { padding-top: var(--space-xs); }
  .lizenz { margin: 0; padding-top: var(--space-xs); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; line-height: 1.5; white-space: pre-wrap; }
</style>
