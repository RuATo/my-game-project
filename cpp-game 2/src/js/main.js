#Ha
#Line 1-3: ギットハブの例として追加した。
#2026/06/10 b

let engineModule = null;

async function loadEngine() {
  if (engineModule) return engineModule;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/src/engine.js';
    script.onload = async () => {
      await new Promise((res) => {
        Module['onRuntimeInitialized'] = res;
      });
      engineModule = Module;
      resolve(engineModule);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const workspace = document.getElementById('workspace');
const runBtn = document.getElementById('runBtn');
const saveCppBtn = document.getElementById('saveCppBtn');
const clearWorkspaceBtn = document.getElementById('clearWorkspaceBtn');
const resultOutput = document.getElementById('resultOutput');

let draggedType = null;
let draggedText = null;

// ===== Helper functions =====
function setRunningState(isRunning) {
  runBtn.disabled = isRunning;
  runBtn.textContent = isRunning ? '⏳ 実行中...' : '▶ 実行する';
}

function updateRunBtn() {
  const program = collectProgramData();
  runBtn.disabled = program.length === 0;
}

function syncPaletteTextLabels() {
  document.querySelectorAll('.palette-block[data-block-type="text"]').forEach((block) => {
    const value = block.dataset.textValue || '';
    const label = block.querySelector('.code-inline');
    if (label) {
      label.textContent = `"${value}"`;
    }
  });
}

function ensureStack() {
  let stack = workspace.querySelector('.editor-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'editor-stack';
    workspace.appendChild(stack);
  }
  return stack;
}

function updateWorkspaceState() {
  const hasBlocks = workspace.querySelectorAll('.workspace-line').length > 0;
  workspace.classList.toggle('has-blocks', hasBlocks);
}

function createTextBlock(text = '') {
  const textBlock = document.createElement('div');
  textBlock.className = 'text-block';
  textBlock.draggable = true;
  textBlock.dataset.blockType = 'text';
  textBlock.dataset.value = text;
  textBlock.textContent = `"${text}"`;

  textBlock.addEventListener('dragstart', (event) => {
    draggedType = 'text';
    draggedText = textBlock.dataset.value;
    textBlock.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'copyMove';
  });

  textBlock.addEventListener('dragend', () => {
    textBlock.classList.remove('dragging');
    draggedType = null;
    draggedText = null;
  });

  return textBlock;
}

function createSlot() {
  const slot = document.createElement('div');
  slot.className = 'text-slot';
  slot.textContent = '[text]';

  slot.addEventListener('dragover', (event) => {
    if (draggedType === 'text') {
      event.preventDefault();
    }
  });

  slot.addEventListener('drop', (event) => {
    if (draggedType !== 'text') return;
    event.preventDefault();

    slot.innerHTML = '';
    slot.classList.add('filled');
    slot.appendChild(createTextBlock(draggedText || ''));
    showWaitingMessage();
    updateRunBtn(); // ← slot埋めたらボタン状態更新
  });

  slot.addEventListener('dblclick', () => {
    slot.classList.remove('filled');
    slot.textContent = '[text]';
    showWaitingMessage();
    updateRunBtn(); // ← slot空にしたらボタン状態更新
  });

  return slot;
}

function createCoutLine() {
  const line = document.createElement('div');
  line.className = 'workspace-line';
  line.dataset.blockType = 'cout';

  const bar = document.createElement('span');
  bar.className = 'bar purple';

  const code = document.createElement('div');
  code.className = 'workspace-code';
  code.append('cout << ');
  code.appendChild(createSlot());
  code.append(' << endl;');

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-btn';
  removeBtn.textContent = '×';

  removeBtn.addEventListener('click', () => {
    line.remove();
    updateWorkspaceState();
    showWaitingMessage();
    updateRunBtn(); // ← ブロック削除時にボタン状態更新
  });

  line.append(bar, code, removeBtn);
  return line;
}

function addBlockToWorkspace(type) {
  const stack = ensureStack();

  if (type === 'cout') {
    stack.appendChild(createCoutLine());
  }

  updateWorkspaceState();
  showWaitingMessage();
  updateRunBtn(); // ← ブロック追加時にボタン状態更新
}

function collectProgramData() {
  const lines = [...workspace.querySelectorAll('.workspace-line')];

  const result = lines
    .map((line) => {
      const textBlock = line.querySelector('.text-slot .text-block');
      const value = textBlock ? textBlock.dataset.value : '';
      return { type: 'cout', value };
    })
    .filter((item) => item.value !== '');

  console.log('📦 現在のブロックデータ:', result);

  return result;
}

function showWaitingMessage() {
  const program = collectProgramData();

  if (program.length === 0) {
    resultOutput.textContent = 'まだ実行していません。\n右側からブロックを追加してください。';
    return;
  }

  resultOutput.textContent = '実行待ちです。\n「実行する」を押すと、結果をここに表示します。';
}

function renderExecutionResult(resultFromA) {
  if (typeof resultFromA === 'string') {
    resultOutput.textContent = resultFromA || '(出力なし)';
    return;
  }

  if (resultFromA && typeof resultFromA === 'object') {
    const output = resultFromA.output ?? '';
    const success = resultFromA.success ?? true;
    const error = resultFromA.error ?? '';

    if (!success) {
      resultOutput.textContent = error || '実行中にエラーが発生しました。';
      return;
    }

    resultOutput.textContent = output || '(出力なし)';
    return;
  }

  resultOutput.textContent = '結果の形式が正しくありません。';
}

function downloadJsonFile(content) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'blocks.json';
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function setupPaletteDrag() {
  document.querySelectorAll('.palette-block').forEach((block) => {
    block.addEventListener('dragstart', (event) => {
      draggedType = block.dataset.blockType;

      if (draggedType === 'text') {
        draggedText = block.dataset.textValue || '';
      } else {
        draggedText = null;
      }

      block.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'copy';
    });

    block.addEventListener('dragend', () => {
      block.classList.remove('dragging');
      draggedType = null;
      draggedText = null;
    });
  });
}

async function executeProgram(program) {
  try {
    const module = await loadEngine();

    const lines = program
      .filter((block) => block.type === 'cout')
      .map((block) => block.value)
      .join('\n');

    const result = module.ccall(
      'run_program',
      'string',
      ['string'],
      [lines]
    );

    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ===== Workspace drag events =====
workspace.addEventListener('dragover', (event) => {
  if (draggedType === 'cout') {
    event.preventDefault();
    workspace.classList.add('drag-over');
  }
});

workspace.addEventListener('dragleave', () => {
  workspace.classList.remove('drag-over');
});

workspace.addEventListener('drop', (event) => {
  if (draggedType !== 'cout') return;
  event.preventDefault();
  workspace.classList.remove('drag-over');
  addBlockToWorkspace('cout');
});

// ===== Button event listeners (各1回だけ) =====
runBtn.addEventListener('click', async () => {
  const program = collectProgramData();
  if (program.length === 0) return;

  // ✅ 古いlogを消して、送信直前データだけ表示
  console.clear();
  console.log('🚀 実行開始 - 送信データ:', program);

  setRunningState(true);          // 実行中表示 ON + ボタン無効化
  resultOutput.textContent = '実行中です...';
 // downloadJsonFile(JSON.stringify(program, null, 2));

  try {
    const resultFromA = await executeProgram(program);
    renderExecutionResult(resultFromA);
  } catch (error) {
    resultOutput.textContent = '実行結果の受信に失敗しました。';
    console.error(error);
  } finally {
    setRunningState(false);       // 実行中表示 OFF
    updateRunBtn();               // 状態に応じて再チェック
  }
});

saveCppBtn.addEventListener('click', () => {
  resultOutput.textContent = '`.cppで保存する` は次の段階で実装します。';
});

clearWorkspaceBtn.addEventListener('click', () => {
  workspace.querySelector('.editor-stack')?.remove();
  updateWorkspaceState();
  showWaitingMessage();
  updateRunBtn(); // ← clearしたら無効化
});



// ===== 初期化 =====
syncPaletteTextLabels();
setupPaletteDrag();
updateWorkspaceState();
showWaitingMessage();
updateRunBtn(); // 起動時はブロックなし → disabled
