const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { getVersionFromFile, updateVersionFile } = require('../src/version-file');

const CSPROJ = `<Project>
  <PropertyGroup>
    <Version>0.72.1</Version>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="OpenMcdf" Version="3.3.0" />
  </ItemGroup>
</Project>
`;

function tmp(name, content) {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'br-')), name);
  fs.writeFileSync(p, content);
  return p;
}

test('reads the <Version> element, not the PackageReference attribute', () => {
  assert.equal(getVersionFromFile(tmp('a.csproj', CSPROJ)), '0.72.1');
});

test('bumps only the <Version> element, leaving PackageReference untouched', () => {
  const p = tmp('b.csproj', CSPROJ);
  updateVersionFile(p, '0.73.0');
  const out = fs.readFileSync(p, 'utf-8');
  assert.match(out, /<Version>0\.73\.0<\/Version>/);
  assert.match(out, /Version="3\.3\.0"/); // package ref unchanged
});

test('handles JSON and bare version files', () => {
  assert.equal(getVersionFromFile(tmp('v.json', '{"version": "1.4.2"}')), '1.4.2');
  assert.equal(getVersionFromFile(tmp('VERSION', '2.0.1\n')), '2.0.1');
});

test('handles Python version files', () => {
  assert.equal(getVersionFromFile(tmp('pyproject.toml', '[project]\nname = "x"\nversion = "1.4.2"\n')), '1.4.2');
  assert.equal(getVersionFromFile(tmp('setup.cfg', '[metadata]\nversion = 2.0.1\n')), '2.0.1');
  const setup = tmp('setup.py', 'setup(\n    name="x",\n    version="3.1.0",\n)\n');
  assert.equal(getVersionFromFile(setup), '3.1.0');
  updateVersionFile(setup, '3.2.0');
  assert.match(fs.readFileSync(setup, 'utf-8'), /version="3\.2\.0"/);
});

test('throws when no version is present', () => {
  assert.throws(() => getVersionFromFile(tmp('none.txt', 'no version here')), /No version/);
});
