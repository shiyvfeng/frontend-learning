import React from "react";
import {
  bCases,
  bFields,
  bTech,
  caseB,
  auditB,
  filledB,
  bScope,
  updateBSource,
} from "./stage-b-content";

export function StructureAudit({ data }) {
  const rows = auditB(data),
    missing = rows.filter((r) => !r.filled);
  return (
    <aside className="writeb-audit" aria-label="本地栏目覆盖检查">
      <h3>栏目覆盖检查 · 非语义评分</h3>
      <div role="status">
        已填 {rows.length - missing.length} / {rows.length} 个栏目。
        {missing.length
          ? `尚缺：${missing.map((r) => r.label).join("、")}。后续站可继续补充。`
          : "全部栏目有内容；仍未判断语义是否正确，不代表方案合格或验收通过。"}
      </div>
      <p>{bScope}</p>
    </aside>
  );
}

const revealInput = (e) =>
  e.currentTarget.scrollIntoView({ block: "center", behavior: "auto" });

function Review({ checked, onChange, children }) {
  return (
    <label className="checkbox-label writeb-review">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}

export function ComparisonLab({ data, patch }) {
  const c = caseB(data),
    good = data.comparison === "good";
  return (
    <div className="writeb-lab">
      <p className="writeb-boundary">
        <strong>本地写作练习 · 无网络AI调用</strong>
        。原文由你编辑；模糊只是尚缺信息，不等于诉求错误。下面是人工编写的参考，不是对你内容的自动评价。
      </p>
      <label htmlFor="writeb-case">参考案例</label>
      <select
        id="writeb-case"
        value={data.caseId}
        onChange={(e) =>
          patch((old) =>
            updateBSource(old, {
              caseId: e.target.value,
              vagueSeen: false,
              goodSeen: false,
              comparisonReviewed: false,
              effectReviewed: false,
              technologyReviewed: false,
              qualityReviewed: false,
            }),
          )
        }
      >
        {bCases.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <p>
        切换案例只改变参考，不替换你的原文、栏目或编辑草稿；请重新核对内容是否适配。
      </p>
      <div className="writeb-comparison-switch">
        <button
          aria-pressed={!good}
          onClick={() => patch({ comparison: "vague", vagueSeen: true })}
        >
          查看模糊示例
        </button>
        <button
          aria-pressed={good}
          onClick={() => patch({ comparison: "good", goodSeen: true })}
        >
          查看具体示例
        </button>
      </div>
      <article className="writeb-example" aria-label="同一效果的人工对照示例">
        <span className="eyebrow">
          人工示例 · {c.name} · {good ? "补充条件" : "信息尚少"}
        </span>
        <p className="writeb-example-text">{good ? c.good : c.vague}</p>
        <h3>{good ? "具体在哪里" : "还需要补什么"}</h3>
        {good ? (
          <p>
            说明了对象与效果、输入/状态/恢复、候选成立条件和待验证的质量约束；这是一个合理版本，不是唯一正确表达，也没有声称实现或测试已经完成。
          </p>
        ) : (
          <ul>
            {c.missing.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        )}
      </article>
      <div className="writeb-field">
        <label htmlFor="writeb-original">你的原始需求（单独保留）</label>
        <p id="writeb-original-help">
          可写自己的需求，最多1200字符。后续栏目和生成按钮不会自动改写原文；请勿填写敏感内容。
        </p>
        <textarea
          onFocus={revealInput}
          id="writeb-original"
          aria-describedby="writeb-original-help"
          maxLength={1200}
          value={data.original}
          onChange={(e) =>
            patch((old) =>
              updateBSource(old, {
                original: e.target.value,
                comparisonReviewed: false,
              }),
            )
          }
          placeholder="先写你的真实诉求，或填入参考后再编辑。"
        />
        <button
          onClick={() =>
            patch((old) =>
              updateBSource(old, {
                original: c.vague,
                comparisonReviewed: false,
              }),
            )
          }
        >
          填入本案例原文示例（替换原文）
        </button>
      </div>
      <Review
        checked={data.comparisonReviewed}
        onChange={(v) => patch({ comparisonReviewed: v })}
      >
        我已区分原始诉求、拟议方案和待确认内容
      </Review>
      <StructureAudit data={data} />
    </div>
  );
}

function WritingField({ data, patch, field }) {
  const value = data.fields[field.id],
    c = caseB(data),
    review = field.group === 1 ? "effectReviewed" : "qualityReviewed";
  const update = (value) =>
    patch((old) =>
      updateBSource(old, {
        fields: { ...old.fields, [field.id]: value },
        [review]: false,
      }),
    );
  return (
    <div className="writeb-field" data-writing-field={field.id}>
      <div className="writeb-field-title">
        <label htmlFor={`writeb-${field.id}`}>{field.label}</label>
        <small>{value.length} / 500</small>
      </div>
      <p id={`writeb-${field.id}-help`}>{field.prompt}</p>
      <textarea
        onFocus={revealInput}
        id={`writeb-${field.id}`}
        aria-describedby={`writeb-${field.id}-help`}
        maxLength={500}
        value={value}
        onChange={(e) => update(e.target.value)}
        placeholder="用自己的话填写，或先填示例再真实编辑。"
      />
      <button onClick={() => update(c.examples[field.id])}>
        填入{field.label}示例（替换本栏）
      </button>
      <p className="writeb-field-status">
        {filledB(value)
          ? "本栏已填；含义、矛盾和可行性未检查。"
          : "本栏尚空；写下意图后，再自行核对。"}
      </p>
    </div>
  );
}

export function EffectLab({ data, patch }) {
  return (
    <div className="writeb-lab">
      <p className="writeb-boundary">
        参考案例：{caseB(data).name}
        。填写的是拟议说明，不会改变单独保存的原始需求。
      </p>
      <div className="writeb-fields">
        {bFields
          .filter((f) => f.group === 1)
          .map((f) => (
            <WritingField key={f.id} field={f} data={data} patch={patch} />
          ))}
      </div>
      <div className="writeb-decomposition">
        <h3>你的拆解顺序 · 文字镜像，不是效果运行器</h3>
        <ol>
          {bFields
            .filter((f) => f.group === 1)
            .map((f) => (
              <li key={f.id}>
                <strong>{f.label}：</strong>
                {data.fields[f.id] || "尚未填写"}
              </li>
            ))}
        </ol>
        <p>
          这些文字没有被执行，也没有被模型理解。重复关键词、否定句或互相矛盾的内容仍可能显示“已填”，需要你人工核对。
        </p>
      </div>
      <Review
        checked={data.effectReviewed}
        onChange={(v) => patch({ effectReviewed: v })}
      >
        我已人工核对触发前后状态、恢复路径及是否矛盾
      </Review>
      <StructureAudit data={data} />
    </div>
  );
}

export function TechnologyLab({ data, patch }) {
  const selected = bTech.find((t) => t.id === data.technology) || bTech[0];
  const update = (change) =>
    patch((old) =>
      updateBSource(old, { ...change, technologyReviewed: false }),
    );
  return (
    <div className="writeb-lab">
      <p className="writeb-boundary">
        <strong>候选没有质量排名，也不按库数量加分。</strong>{" "}
        可以不限定技术，请Agent先提出方案。实际项目、内容规模、交互和兼容约束决定取舍。
      </p>
      <label htmlFor="writeb-technology">技术倾向</label>
      <select
        id="writeb-technology"
        value={data.technology}
        onChange={(e) => update({ technology: e.target.value })}
      >
        {bTech.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <p>切换候选不会替换你已写的理由；重新核对它是否仍然成立。</p>
      <div className="writeb-condition">
        <h3>当前候选的成立条件 · 人工提示</h3>
        <p>{selected.condition}</p>
      </div>
      {data.technology === "custom" && (
        <div className="writeb-field">
          <label htmlFor="writeb-custom">自定义候选名称</label>
          <input
            id="writeb-custom"
            type="text"
            maxLength={100}
            value={data.customTech}
            onChange={(e) => update({ customTech: e.target.value })}
          />
          <button
            onClick={() =>
              update({ customTech: "项目既有组件与状态管理，按需增加局部CSS" })
            }
          >
            填入自定义候选示例（替换名称）
          </button>
          <p>只是文字候选，不会安装或调用任何库。</p>
        </div>
      )}
      <div className="writeb-field">
        <label htmlFor="writeb-reason">技术取舍理由</label>
        <textarea
          onFocus={revealInput}
          id="writeb-reason"
          maxLength={500}
          value={data.techReason}
          onChange={(e) => update({ techReason: e.target.value })}
          placeholder="说明为什么适用、什么时候不适用，以及如何验收。"
        />
        <button
          onClick={() =>
            update({
              techReason: `对于「${caseB(data).name}」，${selected.condition} 先检查现有能力，不能满足约束再提出替代；最终以实际行为、体积与目标环境验收，不用库名或数量决定质量。`,
            })
          }
        >
          填入取舍示例（替换理由）
        </button>
      </div>
      <details className="writeb-alternatives">
        <summary>比较其他候选的条件（不是排名）</summary>
        {bTech
          .filter((t) => t.id)
          .map((t) => (
            <div key={t.id}>
              <h3>{t.label}</h3>
              <p>{t.condition}</p>
            </div>
          ))}
      </details>
      <Review
        checked={data.technologyReviewed}
        onChange={(v) => patch({ technologyReviewed: v })}
      >
        我已核对候选的成立条件，库数量不是质量标准
      </Review>
      <StructureAudit data={data} />
    </div>
  );
}

export function QualityLab({ data, patch }) {
  return (
    <div className="writeb-lab">
      <p className="writeb-boundary">
        把验收写成“操作后应看到什么”，而非“已经通过”。性能目标需说明环境和测量方法，不能把愿望写成帧率或兼容性保证。
      </p>
      <div className="writeb-fields">
        {bFields
          .filter((f) => f.group === 3)
          .map((f) => (
            <WritingField key={f.id} field={f} data={data} patch={patch} />
          ))}
      </div>
      <Review
        checked={data.qualityReviewed}
        onChange={(v) => patch({ qualityReviewed: v })}
      >
        我已人工核对质量约束和可观察的验收步骤
      </Review>
      <StructureAudit data={data} />
    </div>
  );
}
