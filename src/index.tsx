import { renderRoot } from "../core";

function Test2(props) {
  return <span>test2s
    {props.children}
  </span>
}

function Test() {
  this.useCreated(() => {
    this.count = 0;
  });
  this.useMounted(() => {
    this.count++;
  });
  return (
    <Test2 name="222" ref="test2">
      <div>
        <div>23</div>
        <div>3</div>
      </div>
      <div>322</div>
    </Test2>
  );
}

renderRoot(<Test/>, document.getElementById("app"));
