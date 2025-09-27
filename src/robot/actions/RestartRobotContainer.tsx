import {
	BulbFilled,
	DownOutlined,
	ExportOutlined,
	ImportOutlined,
	InboxOutlined,
	InteractionFilled,
	PlayCircleFilled,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { App, Button, Dropdown, Upload } from 'antd';
import type { RcFile } from 'antd/es/upload/interface';
import type { MenuProps } from 'antd';
import React, { useRef } from 'react';
import type { Api } from '@/api/wechat-robot/wechat-robot';

type IRobot = Api.V1RobotListList.ResponseBody['data']['items'][number];

interface IProps {
	robotId: number;
	robot: IRobot;
	onRefresh: () => void;
}

const RestartRobotContainer = (props: IProps) => {
	const { message, modal } = App.useApp();

	// 直接保存 RcFile，避免依赖 UploadFile.originFileObj（某些场景下可能为 undefined）
	const loginDataFile = useRef<RcFile | undefined>(undefined);

	const { runAsync, loading } = useRequest(
		async () => {
			await window.wechatRobotClient.api.v1RobotStateList({
				id: props.robotId,
			});
		},
		{
			manual: true,
			onSuccess: () => {
				message.success('刷新成功');
				props.onRefresh();
			},
			onError: reason => {
				message.error(reason.message);
			},
		},
	);

	const { runAsync: exportLoginData, loading: exportLoginDataLoading } = useRequest(
		async () => {
			return await window.wechatRobotClient.api.v1RobotExportLoginDataList({
				id: props.robotId,
			});
		},
		{
			manual: true,
			onSuccess: resp => {
				try {
					const loginData = resp.data?.data;
					if (!loginData) {
						message.error('登录信息已过期');
						return;
					}
					const blob = new Blob([loginData], { type: 'application/json;charset=utf-8' });
					const filename = `${props.robot?.wechat_id || 'logindata'}.json`;
					const url = URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					a.download = filename;
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					URL.revokeObjectURL(url);
					message.success('导出成功');
				} catch (ex) {
					if (ex instanceof Error) {
						message.error('导出失败: ' + ex.message);
					}
				}
			},
			onError: reason => {
				message.error(reason.message);
			},
		},
	);

	const { runAsync: importLoginData, loading: importLoginDataLoading } = useRequest(
		async (data: string) => {
			return await window.wechatRobotClient.api.v1RobotImportLoginDataCreate(
				{
					id: props.robotId,
				},
				{
					data,
				},
			);
		},
		{
			manual: true,
			onSuccess: () => {
				message.success('导入成功');
			},
			onError: reason => {
				message.error(reason.message);
			},
		},
	);

	const { runAsync: restartClient, loading: restartClientLoading } = useRequest(
		async () => {
			await window.wechatRobotClient.api.v1RobotRestartClientCreate({
				id: props.robotId,
			});
		},
		{
			manual: true,
			onSuccess: () => {
				message.success('重启客户端成功');
			},
			onError: reason => {
				message.error(reason.message);
			},
		},
	);

	const { runAsync: restartServer, loading: restartServerLoading } = useRequest(
		async () => {
			await window.wechatRobotClient.api.v1RobotRestartServerCreate({
				id: props.robotId,
			});
		},
		{
			manual: true,
			onSuccess: () => {
				message.success('重启服务端成功');
			},
			onError: reason => {
				message.error(reason.message);
			},
		},
	);

	const items: MenuProps['items'] = [
		{
			label: '导出登录数据',
			key: 'export-login-data',
			icon: <ExportOutlined />,
			onClick: () => {
				if (exportLoginDataLoading) {
					message.warning('正在导出登录数据，请稍后再试');
					return;
				}
				modal.confirm({
					title: '导出机器人登录数据',
					width: 335,
					content: (
						<>
							确定要<span style={{ color: '#1890ff' }}>导出</span>这个机器人的<b>登录数据</b>吗？
						</>
					),
					okText: '导出',
					cancelText: '取消',
					onOk: async () => {
						await exportLoginData();
					},
				});
			},
		},
		{
			label: '导入登录数据',
			key: 'import-login-data',
			icon: <ImportOutlined />,
			onClick: () => {
				if (importLoginDataLoading) {
					message.warning('正在导入登录数据，请稍后再试');
					return;
				}
				modal.confirm({
					title: '导入机器人登录数据',
					width: 460,
					content: (
						<>
							<Upload.Dragger
								name="file"
								maxCount={1}
								multiple={false}
								accept=".json"
								beforeUpload={(file: RcFile) => {
									loginDataFile.current = file;
									return false; // 阻止自动上传，转为手动处理
								}}
								onRemove={() => {
									loginDataFile.current = undefined;
								}}
							>
								<p className="ant-upload-drag-icon">
									<InboxOutlined />
								</p>
								<p className="ant-upload-text">单击或将 JSON 文件拖到此区域进行上传</p>
							</Upload.Dragger>
						</>
					),
					okText: '导入',
					cancelText: '取消',
					onOk: async () => {
							if (!loginDataFile.current) {
								message.error('请先选择要导入的 JSON 文件');
								throw new Error('No file selected');
							}
							try {
								const fileObj = loginDataFile.current;
								// 基础校验：扩展名 & 类型（可选）
								if (!/\.json$/i.test(fileObj.name)) {
									message.error('文件扩展名不是 .json');
									throw new Error('Invalid extension');
								}
								const text = await fileObj.text();
								try {
									JSON.parse(text);
								} catch (ex) {
									message.error('不是合法的 JSON 文件');
									throw ex;
								}
								await importLoginData(text);
								// 成功后清理状态
								loginDataFile.current = undefined;
								props.onRefresh();
							} catch (ex) {
								throw ex as Error;
							}
					},
				});
			},
		},
		{
			label: '重启客户端容器',
			key: 'restart-client-container',
			icon: <BulbFilled />,
			onClick: () => {
				if (restartClientLoading) {
					message.warning('正在重启客户端容器，请稍后再试');
					return;
				}
				modal.confirm({
					title: '重启机器人客户端',
					width: 335,
					content: (
						<>
							确定要重启这个机器人的<b>客户端容器</b>吗？
						</>
					),
					okText: '重启',
					cancelText: '取消',
					onOk: async () => {
						await restartClient();
						props.onRefresh();
					},
				});
			},
		},
		{
			label: '重启服务端容器',
			key: 'restart-server-container',
			icon: <PlayCircleFilled />,
			onClick: () => {
				if (restartServerLoading) {
					message.warning('正在重启服务端容器，请稍后再试');
					return;
				}
				modal.confirm({
					title: '重启机器人服务端容器',
					width: 335,
					content: (
						<>
							确定要重启这个机器人的<b>服务端容器</b>吗？
						</>
					),
					okText: '重启',
					cancelText: '取消',
					onOk: async () => {
						await restartServer();
						props.onRefresh();
					},
				});
			},
		},
	];

	return (
		<Dropdown.Button
			type="primary"
			menu={{ items }}
			buttonsRender={() => {
				return [
					<Button
						key="left"
						type="primary"
						loading={loading}
						icon={<InteractionFilled />}
						onClick={runAsync}
					>
						刷新状态
					</Button>,
					<Button
						key="right"
						type="primary"
						icon={<DownOutlined />}
					/>,
				];
			}}
		/>
	);
};

export default React.memo(RestartRobotContainer);
